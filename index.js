const url = require('url');
const createProxyServer = require('./lib/createProxyServer');
const createProxyResponse = require('./lib/createProxyResponse');
const defaultTimeoutHook = require('./lib/defaultTimeoutHook');

function startProxy({
                       host = '127.0.0.1', scheme = 'http',
                       specialHeader = 'specialHeader', hostname,
                       timeout = 1500, timeoutHook = defaultTimeoutHook
                   }) {
    const proxy = createProxyServer({host, specialHeader});

    return function*(next) {
        const {res, bodyBuffers} = createProxyResponse(this.req);

        proxy.web(this.req, res, {
            target: scheme + '://' + hostname
        });

        try {
            yield new Promise((resolve, reject) => {
                res.once('proxyed', () => resolve());
                setTimeout(reject, timeout);
            });
        } catch (e) {
            timeoutHook.call(this, e);
            return yield next;
        }

        this.status = res.statusCode;

        this.set(res._headers);

        if (this.status === 200) {
            this._proxyResponse = Buffer.concat(bodyBuffers).toString('utf-8');
        }

        yield next;
    }
}

module.exports = startProxy;