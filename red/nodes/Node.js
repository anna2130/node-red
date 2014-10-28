/**
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var util = require("util");
var EventEmitter = require("events").EventEmitter;
var clone = require("clone");
var when = require("when");

var flows = require("./flows");
var comms = require("../comms");

function Node(n) {
    this.id = n.id;
    flows.add(this);
    this.type = n.type;
    if (n.name) {
        this.name = n.name;
    }
    this.wires = n.wires || [];

    var wc = 0;
    this.wires.forEach(function(w) {
        wc+=w.length;
    });
    this._wireCount = wc;
    if (wc === 0) {
        // With nothing wired to the node, no-op send
        this.send = function(msg) {};
    } else if (this.wires.length === 1 && this.wires[0].length === 1) {
        // Single wire, so we can shortcut the send when
        // a single message is sent
        this._wire = this.wires[0][0];
    }
}

util.inherits(Node, EventEmitter);

Node.prototype._on = Node.prototype.on;

Node.prototype.on = function(event, callback) {
    var node = this;
    if (event == "close") {
        if (callback.length == 1) {
            this.close = function() {
                return when.promise(function(resolve) {
                    callback.call(node, function() {
                        resolve();
                    });
                });
            };
        } else {
            this.close = callback;
        }
    } else {
        this._on(event, callback);
    }
};

Node.prototype.close = function() {};

function cloneMessage(msg) {
    // Temporary fix for #97
    // TODO: remove this http-node-specific fix somehow
    var req = msg.req;
    var res = msg.res;
    delete msg.req;
    delete msg.res;
    var m = clone(msg);
    if (req) {
        m.req = req;
        msg.req = req;
    }
    if (res) {
        m.res = res;
        msg.res = res;
    }
    return m;
}

Node.prototype.send = function(msg) {
    var msgSent = false;

    if (msg === null || typeof msg === "undefined") {
        return;
    } else if (!util.isArray(msg)) {
        if (this._wire) {
            // A single message and a single wire on output 0
            // TODO: pre-load flows.get calls - cannot do in constructor
            //       as not all nodes are defined at that point
            if (this._wire._ref) {
                this._wire.receive(msg);
            } else {
                var n1 = flows.get(this._wire);
                this._wire = n1;
                this._wire._ref = true;
                n1.receive(msg);
            }
            return;
        } else {
            msg = [msg];
        }
    }

    var numOutputs = this.wires.length;

    // Build a list of send events so that all cloning is done before
    // any calls to node.receive
    var sendEvents = [];

    // for each output of node eg. [msgs to output 0, msgs to output 1, ...]
    for (var i = 0; i < numOutputs; i++) {
        var wires = this.wires[i]; // wires leaving output i
        if (i < msg.length) {
            var msgs = msg[i]; // msgs going to output i
            if (msgs !== null && typeof msgs !== "undefined") {
                if (!util.isArray(msgs)) {
                    msgs = [msgs];
                }
                var node;
                var k = 0;
                // for each recipent node of that output
                for (var j = 0; j < wires.length; j++) {
                    if (wires[j].ref) {
                        node = wires[j];
                    } else {
                        node = flows.get(wires[j]); // node at end of wire j
                    }
                    if (node) {
                        wires[j] = node;
                        wires[j].ref = true;
                        // for each msg to send eg. [[m1, m2, ...], ...]
                        for (k = 0; k < msgs.length; k++) {
                            if (msgSent) {
                                sendEvents.push({n:node,m:cloneMessage(msgs[k])});
                            } else {
                                // first msg sent so don't clone
                                sendEvents.push({n:node,m:msgs[k]});
                                msgSent = true;
                            }
                        }
                    }
                }
            }
        }
    }

    for (i=0;i<sendEvents.length;i++) {
        var ev = sendEvents[i];
        ev.n.receive(ev.m);
    }
};

Node.prototype.receive = function(msg) {
    this.emit("input", msg);
};

function log_helper(self, level, msg) {
    var o = {
        level: level,
        id: self.id,
        type: self.type,
        msg: msg
    };
    if (self.name) {
        o.name = self.name;
    }
    self.emit("log", o);
}

Node.prototype.log = function(msg) {
    log_helper(this, 'log', msg);
};

Node.prototype.warn = function(msg) {
    log_helper(this, 'warn', msg);
};

Node.prototype.error = function(msg) {
    log_helper(this, 'error', msg);
};

/**
 * status: { fill:"red|green", shape:"dot|ring", text:"blah" }
 */
Node.prototype.status = function(status) {
    comms.publish("status/" + this.id, status, true);
};
module.exports = Node;
