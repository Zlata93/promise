(function (context) {
    if (context.Promise && Object.prototype.toString.call(new Promise(function() {})) === '[object Promise]') return;

    const state = {
        pending: 0,
        resolved: 1,
        rejected: 2
    };

    const asyncSetTimer = typeof setImmediate !== 'undefined' ? setImmediate : setTimeout;

    function getThen(value) {
        if (typeof value === 'object' || typeof value === 'function') {
            return value.then;
        }
    }

    function handle(self, handler) {
        if (self._state === 0) {
            self._deferreds.push(handler);
        } else if (self._state === 1) {
            handleHelper(handler, 'didFulfill', self);
        } else if (self._state === 2) {
            handleHelper(handler, 'didReject', self);
        }
    }

    function handleHelper(handler, cbName, self) {
        asyncSetTimer(function () {
            if (typeof handler[cbName] === 'function') {
                let res;
                try {
                    res = handler[cbName](self._value);
                } catch (e) {
                    reject(handler.promise, res);
                    return;
                }
                resolve(handler.promise, res);
            } else {
                resolve(handler.promise, self._value);
            }
        }, 0);
    }

    function resolve(self, value) {
        const then = getThen(value);
        try {
            if (then && typeof then === 'function') {
                doResolve(then.bind(value), self);
            } else {
                self._state = state.resolved;
                self._value = value;
                for (let i = 0; i < self._deferreds.length; i++) {
                    handle(self, self._deferreds[i]);
                }
                self._deferreds = [];
            }
        } catch (e) {
            reject(self, e);
        }
    }

    function reject(self, error) {
        self._state = state.rejected;
        self._value = error;
        for (let i = 0; i < self._deferreds.length; i++) {
            handle(self, self._deferreds[i]);
        }
        self._deferreds = [];
    }

    function doResolve(cb, self) {
        let done = false;
        try {
            cb(function(value) {
                if (done) return;
                done = true;
                resolve(self, value);
            }, function (error) {
                if (done) return;
                done = true;
                reject(self, error);
            });
        } catch (e) {
            if (done) return;
            done = true;
            reject(self, e);
        }
    }

    function MyPromise(cb) {
        if (!(MyPromise.prototype.isPrototypeOf(this))) {
            throw new TypeError('Promise constructor must be called with \'new\' keyword');
        }
        if (typeof cb !== 'function') {
            throw new TypeError('not a function');
        }
        this._state = state.pending;
        this._value = undefined;
        this._deferreds = [];

        doResolve(cb, this);
    }

    MyPromise.prototype.catch = function (didReject) {
        return this.then(null, didReject);
    };

    MyPromise.prototype.then = function (didFulfill, didReject) {
        const promise = new this.constructor(function() {});
        handle(this, {
            didFulfill: didFulfill,
            didReject: didReject,
            promise: promise
        });
        return promise;
    };

    context['MyPromise'] = MyPromise;

})(window);