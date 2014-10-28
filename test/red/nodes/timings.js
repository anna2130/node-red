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

var should = require("should");
var sinon = require('sinon');
var fs = require('fs');
var RedNode = require("../../../red/nodes/Node");
var comms = require('../../../red/comms');

describe('Node', function() {

    var n = 1000;

    function twoDP(num) {
        return Math.floor(num * 100) / 100;
    }

    function printLog(n2sum, n3sum) {
        var n2 = n2sum/n;
        var n3 = n3sum/n - n2;
        console.log("Avg time for n2: " + Math.floor(n2*100)/100);
        console.log("Avg time for n3: " + Math.floor(n3*100)/100);

        if (n2 > n3) {
            console.log("\nRatio n2:n3 " + Math.floor(n2 / n3) + ":1");
        } else {
            console.log("\nRatio n2:n3 1:" + Math.floor(n3 / n2));
        }
    }

    function print3Log(n2sum, n3sum, n4sum) {
        var n2 = n2sum/n;
        var n3 = n3sum/n - n2;
        var n4 = n4sum/n - n2 - n3;
        console.log("Avg time for n2: " + Math.floor(n2*100)/100);
        console.log("Avg time for n3: " + Math.floor(n3*100)/100);
        console.log("Avg time for n4: " + Math.floor(n4*100)/100);

        if (n2 < n3 && n2 < n4) {
            console.log("\nRatio n2:n3:n4 1:" + Math.floor(n3 / n2) + ":" + Math.floor(n4 / n2));
        } else if (n3 < n2 && n3 < n4) {
            console.log("\nRatio n2:n3:n4 " + Math.floor(n2 / n3) + ":1:" + Math.floor(n4 / n3));
        } else {
            console.log("\nRatio n2:n3:n4 " + Math.floor(n2 / n4) + ":" + Math.floor(n3 / n4) + ":1");
        }
    }

    function logAvgTimes(nodes) {
        lastTime = 0;
        for (var i = 1; i < nodes.length; ++i) {
            avg = nodes[i].sum/n;
            console.log("Avg time for n" + (i+1) + ": " +
                Math.floor(avg - lastTime));
            lastTime = avg;
        }
    }

    describe('#timing ' + n + ' messages', function() {

        it('one message being sent to one node', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n2']]});
            var n2 = new RedNode({id:'n2',type:'abc'});

            var rcvdCount = 0;
            var sum = 0;
            n2.on('input', function(msg) {
                rcvdCount++;
                var diff = process.hrtime(msg.payload);
                var d = diff[0] * 1e9 + diff[1];
                sum += d;

                if(rcvdCount === n) {
                    console.log("Avg time: " + sum/n);
                    done();
                }
            });

            for (var i = 0; i < n; ++i) {
                var message = {payload: process.hrtime()};
                n1.send(message);
            }
        });

        it('one message being sent to two nodes via one output', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n2', 'n3']]});
            var n2 = new RedNode({id:'n2',type:'abc'});
            var n3 = new RedNode({id:'n3',type:'abc'});

            var n2RcvdCount = 0;
            var n3RcvdCount = 0;
            var n2sum = 0;
            var n3sum = 0;
            n2.on('input', function(msg) {
                n2RcvdCount++;
                var diff = process.hrtime(msg.payload);
                var d = diff[0] * 1e9 + diff[1];
                n2sum += d;
                // console.log("n2: " + d);

                if(n2RcvdCount === n && n3RcvdCount === n) {
                    printLog(n2sum, n3sum);
                    done();
                }
            });

            n3.on('input', function(msg) {
                n3RcvdCount++;
                var diff = process.hrtime(msg.payload);
                var d = diff[0] * 1e9 + diff[1];
                n3sum += d;
                // console.log("n3: " + d);

                if(n2RcvdCount === n && n3RcvdCount === n) {
                    printLog(n2sum, n3sum);
                    done();
                }
            });

            for (var i = 0; i < n; ++i) {
                var message = {payload: process.hrtime()};
                n1.send(message);
            }
        });

        it('one message being sent to three nodes via one output', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n2', 'n3', 'n4']]});
            var n2 = new RedNode({id:'n2',type:'abc'});
            var n3 = new RedNode({id:'n3',type:'abc'});
            var n4 = new RedNode({id:'n4',type:'abc'});

            var n2RcvdCount = 0;
            var n3RcvdCount = 0;
            var n4RcvdCount = 0;
            var n2sum = 0;
            var n3sum = 0;
            var n4sum = 0;
            n2.on('input', function(msg) {
                n2RcvdCount++;
                var diff = process.hrtime(msg.payload);
                var d = diff[0] * 1e9 + diff[1];
                n2sum += d;
                // console.log("n2: " + d);

                if (n2RcvdCount === n) {
                    if (n3RcvdCount === n && n4RcvdCount === n) {
                        print3Log(n2sum, n3sum, n4sum);
                        done();
                    }
                }
            });

            n3.on('input', function(msg) {
                n3RcvdCount++;
                var diff = process.hrtime(msg.payload);
                var d = diff[0] * 1e9 + diff[1];
                n3sum += d;
                // console.log("n3: " + d);

                if(n3RcvdCount === n) {
                    if (n2RcvdCount === n) {
                        if (n4RcvdCount === n) {
                            print3Log(n2sum, n3sum, n4sum);
                            done();
                        }
                    }
                }
            });

            n4.on('input', function(msg) {
                n4RcvdCount++;
                var diff = process.hrtime(msg.payload);
                var d = diff[0] * 1e9 + diff[1];
                n4sum += d;
                // console.log("n4: " + d);

                if(n4RcvdCount === n) {
                    if (n2RcvdCount === n && n3RcvdCount === n) {
                        print3Log(n2sum, n3sum, n4sum);
                        done();
                    }
                }
            });

            for (var i = 0; i < n; ++i) {
                var message = {payload: process.hrtime()};
                n1.send(message);
            }
        });

        it('one message being sent to two nodes via two outputs', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n2'], ['n3']]});
            var n2 = new RedNode({id:'n2',type:'abc'});
            var n3 = new RedNode({id:'n3',type:'abc'});

            var n2RcvdCount = 0;
            var n3RcvdCount = 0;
            var n2sum = 0;
            var n3sum = 0;
            n2.on('input', function(msg) {
                n2RcvdCount++;
                var diff = process.hrtime(msg.payload);
                var d = diff[0] * 1e9 + diff[1];
                n2sum += d;
                // console.log("n2: " + d);

                if (n2RcvdCount === n) {
                    if (n3RcvdCount === n) {
                        printLog(n2sum, n3sum);
                        done();
                    }
                }
            });

            n3.on('input', function(msg) {
                n3RcvdCount++;
                var diff = process.hrtime(msg.payload);
                var d = diff[0] * 1e9 + diff[1];
                n3sum += d;
                // console.log("n3: " + d);

                if(n3RcvdCount === n) {
                    if (n2RcvdCount === n) {
                        printLog(n2sum, n3sum);
                        done();
                    }
                }
            });

            for (var i = 0; i < n; ++i) {
                var message = {payload: process.hrtime()};
                n1.send([message, message]);
            }
        });

        it('one message being sent to three nodes via three outputs', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n2'], ['n3'], ['n4']]});
            var n2 = new RedNode({id:'n2',type:'abc'});
            var n3 = new RedNode({id:'n3',type:'abc'});
            var n4 = new RedNode({id:'n4',type:'abc'});

            var n2RcvdCount = 0;
            var n3RcvdCount = 0;
            var n4RcvdCount = 0;
            var n2sum = 0;
            var n3sum = 0;
            var n4sum = 0;
            n2.on('input', function(msg) {
                n2RcvdCount++;
                var diff = process.hrtime(msg.payload);
                var d = diff[0] * 1e9 + diff[1];
                n2sum += d;
                // console.log("n2: " + d);

                if (n2RcvdCount === n) {
                    if (n3RcvdCount === n && n4RcvdCount === n) {
                        print3Log(n2sum, n3sum, n4sum);
                        done();
                    }
                }
            });

            n3.on('input', function(msg) {
                n3RcvdCount++;
                var diff = process.hrtime(msg.payload);
                var d = diff[0] * 1e9 + diff[1];
                n3sum += d;
                // console.log("n3: " + d);

                if(n3RcvdCount === n) {
                    if (n2RcvdCount === n && n4RcvdCount === n) {
                        print3Log(n2sum, n3sum, n4sum);
                        done();
                    }
                }
            });

            n4.on('input', function(msg) {
                n4RcvdCount++;
                var diff = process.hrtime(msg.payload);
                var d = diff[0] * 1e9 + diff[1];
                n4sum += d;
                // console.log("n3: " + d);

                if(n4RcvdCount === n) {
                    if (n2RcvdCount === n && n3RcvdCount === n) {
                        print3Log(n2sum, n3sum, n4sum);
                        done();
                    }
                }
            });

            for (var i = 0; i < n; ++i) {
                var message = {payload: process.hrtime()};
                n1.send([message, message, message]);
            }
        });

        it('one message being sent through a single series of 6 nodes', function(done) {
            var n1 = {node: new RedNode({id:'n1',type:'abc',wires:[['n2']]})};
            var n2 = {node: new RedNode({id:'n2',type:'abc',wires:[['n3']]})};
            var n3 = {node: new RedNode({id:'n3',type:'abc',wires:[['n4']]})};
            var n4 = {node: new RedNode({id:'n4',type:'abc',wires:[['n5']]})};
            var n5 = {node: new RedNode({id:'n5',type:'abc',wires:[['n6']]})};
            var n6 = {node: new RedNode({id:'n6',type:'abc'})};

            var nodes = [n1, n2, n3, n4, n5, n6];
            var totalCount = 0;

            var inputFunc = function(node, msg) {
                node.rcvdCount++;
                totalCount++;
                var diff = process.hrtime(msg.payload);
                var d = diff[0] * 1e9 + diff[1];
                node.sum += d;
                // console.log("n: " + d);
                if (totalCount === n * (nodes.length - 1)) {
                    logAvgTimes(nodes);
                    done();
                } else {
                    node.node.send(msg);
                }
            };

            for (var j = 0; j < nodes.length; ++j) {
                nodes[j].rcvdCount = 0;
                nodes[j].sum = 0;
            }

            n2.node.on('input', function(msg) {
                inputFunc(n2, msg);
            });
            n3.node.on('input', function(msg) {
                inputFunc(n3, msg);
            });
            n4.node.on('input', function(msg) {
                inputFunc(n4, msg);
            });
            n5.node.on('input', function(msg) {
                inputFunc(n5, msg);
            });
            n6.node.on('input', function(msg) {
                inputFunc(n6, msg);
            });

            for (var i = 0; i < n; ++i) {
                var message = {payload: process.hrtime()};
                n1.node.send(message);
            }
        });

        it('two identical messages being sent to one node', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n2']]});
            var n2 = new RedNode({id:'n2',type:'abc'});

            var rcvdCount = 0;
            var sum = 0;
            n2.on('input', function(msg) {
                rcvdCount++;
                var diff = process.hrtime(msg.payload);
                var d = diff[0] * 1e9 + diff[1];
                sum += d;

                if(rcvdCount === n) {
                    console.log("Avg time m1: " + sum/n);
                    sum = 0;
                } else if (rcvdCount === n * 2) {
                    console.log("Avg time m2: " + sum/n);
                    done();
                }
            });

            for (var i = 0; i < n; ++i) {
                var m1 = {payload: process.hrtime()};
                n1.send([[m1, m1]]);
            }
        });

        it('two different messages being sent to one node', function(done) {
            var n1 = new RedNode({id:'n1',type:'abc',wires:[['n2']]});
            var n2 = new RedNode({id:'n2',type:'abc'});

            var rcvdCount = 0;
            var sum = 0;
            n2.on('input', function(msg) {
                rcvdCount++;
                var diff = process.hrtime(msg.payload);
                var d = diff[0] * 1e9 + diff[1];
                sum += d;

                if(rcvdCount === n) {
                    console.log("Avg time m1: " + sum/n);
                    sum = 0;
                } else if (rcvdCount === n * 2) {
                    console.log("Avg time m2: " + sum/n);
                    done();
                }
            });

            for (var i = 0; i < n; ++i) {
                var m1 = {payload: process.hrtime()};
                var m2 = {payload: process.hrtime()};
                n1.send([[m1, m2]]);
            }
        });
    });
});
