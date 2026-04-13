let app;
let debug = true;
let screenWidth = window.innerWidth;
let screenHeight = window.innerHeight;
let visionPerc = 1.0;
let focus = true;
let localPlayerID = 0;

function transform(buffer, k8, k32, pattern) {
    const data = new Uint8Array(buffer);
    const out = new Uint8Array(data.length);

    let i = 0;
    let p = 0;

    while (i < data.length) {
        k8 = (k8 * 33) ^ 0xA5;
        k8 &= 0xFF;

        k32 = (k32 * 1664525 + 1013904223) >>> 0;

        if (pattern[p % pattern.length] & 1) {
            out[i] = data[i] ^ k8;
            i += 1;
        } else {
            if (i + 4 <= data.length) {
                let v =
                    (data[i]) |
                    (data[i + 1] << 8) |
                    (data[i + 2] << 16) |
                    (data[i + 3] << 24);

                let x = (v ^ k32) >>> 0;

                out[i] = x & 0xFF;
                out[i + 1] = (x >>> 8) & 0xFF;
                out[i + 2] = (x >>> 16) & 0xFF;
                out[i + 3] = (x >>> 24) & 0xFF;

                i += 4;
            } else {
                out[i] = data[i] ^ k8;
                i += 1;
            }
        }

        p++;
    }

    return out.buffer;
}

function toggleFullScreen() {
    if (!isFullscreen()) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

function isFullscreen() {
    return !(!document.fullscreenElement &&
        !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement);
}

class App {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');

        this.gameScale = 10.0;

        this.ui = null;
        this.game = null;
        this.network = null;
        this.input = null;
    }

    init() {
        this.ui = new UI();
        this.game = new Game();
        this.network = new Network();
        this.input = new Input();

        this.network.getServer();
        this.network.connect();

        this.input.addListeners();
    }

    clickPlay(nick) {
        if (this.network.hasConnection) {
            this.network.spawn(nick);
        }
    }

    enteredGame() {
        this.ui.hide();
        this.game.init();
    }

    leftGame() {
        this.ui.fadeIn();
        this.game.reset();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        screenWidth = window.innerWidth;
        screenHeight = window.innerHeight;

        if (this.network && this.network.hasConnection) {
            this.network.resize();
        }
    }
}

class Game {
    constructor() {
        this.entities = new Map();
        this.playing = false;
    }

    init() {
        this.playing = true;
        this.loop();
    }

    reset() {
        this.entities.clear();
        this.playing = false;
    }

    loop() {
        if (!this.playing) return;

        this.update();
        this.render();

        requestAnimationFrame(() => this.loop());
    }

    update() {
        if (app.network && app.network.hasConnection) {
            app.network.input(app.input.angle, app.input.throttle);
        }
    }

    updateLeaderboard(data) {}
    
    updateMinimap(data) {}

    render() {
        const ctx = app.ctx;

        ctx.clearRect(0, 0, app.canvas.width, app.canvas.height);

        for (let entity of this.entities.values()) {
            entity.draw(ctx);
        }
    }
}

class UI {
    constructor() {
        this.input = document.getElementById('nick');
        this.button = document.getElementById('playButton');

        this.isVisible = true;

        this.button.addEventListener('click', () => {
            if (app) {
                app.clickPlay(this.input.value);
            }
        });

        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.button.click();
            }
        });
    }

    hide() {
        $('#overlay').hide();
        this.isVisible = false;
    }

    fadeIn() {
        setTimeout(() => {
            $('#overlay').fadeIn(300);
            this.isVisible = true;
        }, 1000);
    }
}

class Input {
    constructor() {
        this.angle = 0.0;
        this.throttle = 0;
        this.mouseMoved = false;
        this.minThrottleDistance = 75.0;
    }

    mousedown(e) {
        if (app && app.ui.isVisible)
            return;

        if (app && app.network && app.network.hasConnection && app.game && app.game.playing) {
            if (e.button == 0) {
                app.network.click(1);
            }
        }
    }

    mouseup(e) {
        if (app && app.ui.isVisible)
            return;

        if (app && app.network && app.network.hasConnection && app.game && app.game.playing) {
            if (e.button == 0) {
                app.network.sendClick(0);
            }
        }
    }

    mousemove(e) {
        if (app && app.ui.isVisible)
            return;

        let dx = e.clientX - app.canvas.width / 2;
        let dy = e.clientY - app.canvas.height / 2;

        let angle = Math.atan2(-dy, dx);
        this.angle = angle;

        let radius = this.minThrottleDistance / (10.0 / app.gameScale);
        let distance = Math.hypot(dx, dy);

        if (distance <= radius) {
            this.throttle = 0;
        } else {
            this.throttle = 1;
        }
    }

    keydown(e) {
        if (app && app.ui.isVisible)
            return;

        if (e.keyCode == 32) {
            if (app && app.network && app.network.hasConnection && app.game.playing) {
                app.network.sendClick(true);
            }
        } else if (e.keyCode == 27) {
            app.ui.fadeIn();
        } else if (e.keyCode == 70) {
            toggleFullScreen();
        }
    }

    keyup(e) {
        if (e.keyCode == 32) {
            if(app && app.game.playing){
				app.network.sendClick(0);
			}
        }
    }

    addListeners() {
        document.addEventListener('mousedown', (e) => this.mousedown(e));
        document.addEventListener('mouseup', (e) => this.mouseup(e));
        document.addEventListener('mousemove', (e) => this.mousemove(e));

        document.addEventListener('keydown', (e) => this.keydown(e));
        document.addEventListener('keyup', (e) => this.keyup(e));

        window.addEventListener('focus', () => {
            focus = true;
        });

        window.addEventListener('blur', () => {
            focus = false;
        });
    }
}

class Network {
    constructor() {
        this.webSocket = null;
        this.address = null;

        this.sentPing = false;
        this.sentInit = false;
        this.pingStart = 0;
        this.pingTime = 0;
        this.roomID = null;
        this.hasConnection = false;
        this.shouldReconnect = true;
        this.usingEncryption = false;

        this.k8_c = 0;
        this.k32_c = 0;
        this.k8_s = 0;
        this.k32_s = 0;

        this.pattern = [];

        this.OPCODES = {
            PING: 0x00,
            INIT: 0x01,
            SPAWN: 0x02,
            INPUT: 0x03,
            CLICK: 0x04,
            RESIZE: 0x05,
            LEAVE: 0x06,

            PONG: 0x00,
            ID: 0xA0,
            DELTA: 0xA1,
            MINIMAP: 0xA2,
            LEADERBOARD: 0xA3,
            EVENTS: 0xA4,
            MAP: 0xA5,
            SERVER_FULL: 0xA6,
            KICK: 0xA7,
            UPGRADE: 0xA,

            FLAG_FULL: 0x1,
            FLAG_PARTIAL: 0x2,
            FLAG_DELETE: 0x3,

            FLAG_FLAIL_ATTACHED: 0x01,
            FLAG_FLAIL_ATTRACTING: 0x02,
            FLAG_INVULNERABLE: 0x04,
            FLAG_DECAY: 0x08,
            FLAG_CHARGING: 0x10,

            ENTITY_PLAYER: 1,

            KILL_REASON_LEFT_SCREEN: 1,
            KILL_REASON_SUICIDE: 2
        };
    }

    getServer() {
        this.address = 'ws://192.168.1.15:8081/cze';
    }

    connect() {
        try {
            console.log('Connecting to ' + this.address + '...');
            this.webSocket = new WebSocket(this.address);
        } catch (e) {
            if (debug)
                console.log(e);

            return;
        }

        this.webSocket.onopen = () => this.socketOpen();
        this.webSocket.onclose = () => this.socketClosed();
        this.webSocket.onmessage = (event) => this.processMessage(event);
        this.webSocket.onerror = (e) => this.onError(e);

        this.webSocket.binaryType = 'arraybuffer';
    }

    socketOpen() {
        if (debug)
            console.log('Connected!');

        this.hasConnection = true;

        this.ping();
        this.init();
    }

    socketClosed() {
        if (debug)
            console.log('disconnected');

        this.hasConnection = false;

        if (this.shouldReconnect) {
            setTimeout(() => {
                this.connect();
            }, 1e3);
        }
    }

    createEntity(type, subtype) {
        let entity;

        if (type == this.OPCODES.ENTITY_PLAYER) {
            entity = new Ship();
        } else {
            console.log('Unable to create entity, type: ' + type + ', subtype: ' + subtype);
            return;
        }

        return entity;
    }

    processDelta(buffer) {
        let count = buffer.u16();
        let i = 0;

        while (i < count) {
            let id = buffer.u16();
            let flag = buffer.u8();

            if (flag == this.OPCODES.FLAG_FULL) {
                let type = buffer.u8();
                let subtype = buffer.u8();

                let entity = this.createEntity(type, subtype);
                entity.updateNetwork(buffer, true);
                entity.id = id;

                app.game.entities.set(id, entity);
            } else if (flag == this.OPCODES.FLAG_PARTIAL) {
                let entity = app.game.entities.get(id);

                if (entity) {
                    entity.updateNetwork(buffer, false);
                } else {
                    console.log('Entity with id: ' + id + ' not found');
                }
            } else if (flag == this.OPCODES.FLAG_DELETE) {
                let entity = app.game.entities.get(id);

                if (entity) {
                    entity.deleteNetwork(buffer);
                } else {
                    console.log('Entity with id: ' + id + ' not found');
                }
            }

            i++;
        }
    }

    processLeaderboard(buffer) {
        let count = buffer.u16();
        let i = 0;

        let data = [];

        while (i < count) {
            let id = buffer.u16();
            let score = buffer.u32();
            let nick = buffer.string();

            data.push({
                id,
                score,
                nick
            });

            i++;
        }

        let myScore;
        let myRank;

        if (buffer.offset + 6 < buffer.length) {
            myScore = buffer.u32();
            myRank = buffer.u16();

            data.me = {
                score: myScore,
                rank: myRank
            };
        }

        app.game.updateLeaderboard(data);
    }

    processMinimap(buffer) {
        let count = buffer.u16();
        let i = 0;

        let data = [];

        while (i < count) {
            let x = buffer.u8();
            let y = buffer.u8();
            let r = buffer.u8();

            data.push({
                x,
                y,
                r
            });

            i++;
        }

        app.game.updateMinimap(data);
    }

    processEvents(buffer) {}

    processMap(buffer) {}

    processMessage(event) {
        let data = event.data;

        if (this.usingEncryption) {
            data = transform(data, this.k8_c, this.k32_c, this.pattern);
        }

        let buffer = new Packet(data);
        let opcode = buffer.u8();

        if (debug) {
            console.log('OP: ' + opcode);
        }

        switch (opcode) {
            case this.OPCODES.PONG: {
                let now = Date.now();
                let pingTime = now - this.pingStart;

                if (debug) {
                    console.log('Ping: ' + pingTime);
                }

                this.pingTime = pingTime;

                break;
            }

            case this.OPCODES.ID: {
                localPlayerID = buffer.u32();

                app.enteredGame();

                if (debug) {
                    console.log('Did enter game!');
                    console.log('My ID: ' + localPlayerID);
                }

                break;
            }

            case this.OPCODES.DELTA: {
                this.processDelta(buffer);
                break;
            }

            case this.OPCODES.LEADERBOARD: {
                this.processLeaderboard(buffer);
                break;
            }

            case this.OPCODES.MINIMAP: {
                this.processMinimap(buffer);
                break;
            }

            case this.OPCODES.EVENTS: {
                this.processEvents(buffer);
                break;
            }

            case this.OPCODES.MAP: {
                this.processMap(buffer);
                break;
            }

            case this.OPCODES.SERVER_FULL: {
                if (debug) {
                    console.log('Server full!');
                }

                break;
            }

            case this.OPCODES.KICK: {
                if (debug) {
                    console.log('Kicked');
                }

                this.shouldReconnect = false;

                break;
            }

            case this.OPCODES.UPGRADE: {
                this.k8_c = buffer.u8();
                this.k32_c = buffer.u32();
                this.k8_s = buffer.u8();
                this.k32_s = buffer.u32();

                this.pattern = [];

                for (let i = 9; i < buffer.length; ++i) {
                    this.pattern.push(buffer.u8());
                }

                this.usingEncryption = true;

                break;
            }
        }
    }

    onError(e) {
        if (debug) {
            console.log('socket error: ' + e);
        }
    }

    ping() {
        let buffer = new ArrayBuffer(1);
        let view = new DataView(buffer);

        view.setUint8(0, this.OPCODES.PING, true);

        if (this.usingEncryption) {
            buffer = transform(buffer, this.k8_s, this.k32_s, this.pattern);
        }

        this.webSocket.send(buffer);

        this.sentPing = true;
        this.pingStart = Date.now();
    }

    init() {
        let buffer = new ArrayBuffer(5);
        let view = new DataView(buffer);

        view.setUint8(0, this.OPCODES.INIT, true);

        view.setUint16(1, screenWidth / app.gameScale * visionPerc, true);
        view.setUint16(3, screenHeight / app.gameScale * visionPerc, true);

        if (this.usingEncryption) {
            buffer = transform(buffer, this.k8_s, this.k32_s, this.pattern);
        }

        this.webSocket.send(buffer);

        this.sentInit = true;
    }

    spawn(nick) {
        let buffer = new ArrayBuffer(3 + nick.length * 2);
        let view = new DataView(buffer);

        view.setUint8(0, this.OPCODES.SPAWN, true);

        for (let i = 0; i < nick.length; ++i) {
            view.setUint16(1 + i * 2, nick.charCodeAt(i), true);
        }

        if (this.usingEncryption) {
            buffer = transform(buffer, this.k8_s, this.k32_s, this.pattern);
        }

        this.webSocket.send(buffer);
    }

    input(angle, throttle) {
        let buffer = new ArrayBuffer(1 + 4 + 1);
        let view = new DataView(buffer);

        view.setUint8(0, this.OPCODES.INPUT, true);

        angle = Math.atan2(Math.sin(angle), Math.cos(angle)) + Math.PI;

        view.setFloat32(1, angle, true);

        var flags = 0x0;

        if (throttle)
            flags |= 0x1;

        if (!focus || app.ui.isVisible) {
            flags |= 0x2;
        }

        view.setUint8(1 + 4, flags, true);

        if (this.usingEncryption) {
            buffer = transform(buffer, this.k8_s, this.k32_s, this.pattern);
        }

        this.webSocket.send(buffer);
    }

    click(c) {
        let buffer = new ArrayBuffer(2);
        let view = new DataView(buffer);

        view.setUint8(0, this.OPCODES.CLICK, true);
        view.setUint8(1, c, true);

        if (this.usingEncryption) {
            buffer = transform(buffer, this.k8_s, this.k32_s, this.pattern);
        }

        this.webSocket.send(buffer);
    }

    resize() {
        let buffer = new ArrayBuffer(5);
        let view = new DataView(buffer);

        view.setUint8(0, this.OPCODES.RESIZE, true);

        view.setUint16(1, screenWidth / app.gameScale * visionPerc, true);
        view.setUint16(3, screenHeight / app.gameScale * visionPerc, true);

        if (this.usingEncryption) {
            buffer = transform(buffer, this.k8_s, this.k32_s, this.pattern);
        }

        this.webSocket.send(buffer);
    }

    leave() {
        let buffer = new ArrayBuffer(1);
        let view = new DataView(buffer);

        view.setUint8(0, this.OPCODES.LEAVE, true);

        if (this.usingEncryption) {
            buffer = transform(buffer, this.k8_s, this.k32_s, this.pattern);
        }

        this.webSocket.send(buffer);
    }
}

class Packet {
    constructor(array) {
        this.buffer = new Uint8Array(array).buffer
        this.length = new Uint8Array(array).length
        this.view = new DataView(this.buffer)
        this.offset = 0
    }

    u8() {
        const val = this.view.getUint8(this.offset)
        this.offset += 1
        return val
    }

    u16() {
        const val = this.view.getUint16(this.offset, true)
        this.offset += 2
        return val
    }

    u32() {
        const val = this.view.getUint32(this.offset, true)
        this.offset += 4
        return val
    }

    i8() {
        const val = this.view.getInt8(this.offset)
        this.offset += 1
        return val
    }

    i16() {
        const val = this.view.getInt16(this.offset, true)
        this.offset += 2
        return val
    }

    i32() {
        const val = this.view.getInt32(this.offset, true)
        this.offset += 4
        return val
    }

    f32() {
        const val = this.view.getFloat32(this.offset, true)
        this.offset += 4
        return val
    }

    f64() {
        const val = this.view.getFloat64(this.offset, true)
        this.offset += 8
        return val
    }

    string() {
        let finishedString = "";

        while (true) {
            const currentCharCode = this.u16();
            if (currentCharCode === 0) break;

            finishedString += String.fromCharCode(currentCharCode);
        }

        return finishedString;
    }
}

function init() {
    app = new App();
    app.init();
}

window.onresize = () => app.resize();
window.onload = init;
