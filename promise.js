(function (context) {
  /**
   * проверка наличия нативного промиса
   */
  // if (context.Promise && Object.prototype.toString.call(new Promise(function () {})) === '[object Promise]') {
  //   return;
  // }

  /**
   * три возможных состояния промиса
   */
  const state = {
    pending: 0,
    resolved: 1,
    rejected: 2
  };

  /**
   * используем setTimeout или setImmediate (в зависимости от среды) для асинхронного выполнения
   */
  const asyncSetTimer = typeof setImmediate !== 'undefined' ? setImmediate : setTimeout;

  /**
   * Проверяет, является ли объект thenable
   *
   * @param  {any} value - значение, с которым пытается зарезолвиться промис
   * @return {function|undefined} - функция then для дальнейшего чейнинга, либо undefined при ее отсутствии
   *
   */
  function getThen (value) {
    if (typeof value === 'object' || typeof value === 'function') {
      return value.then;
    }
  }

  /**
   * Вспомогательная для then функция, которая решает, что делать с обрабочиками в зависимости
   * от состояния текущего промиса
   *
   * @param  {object} self - текущий промис
   * @param  {object} handler - объект с обрабочиками нового промиса и самим промисом
   * @return {undefined} - функция ничего не возвращает
   *
   */
  function handle (self, handler) {
    if (self._state === 0) {
      self._deferreds.push(handler);
    } else if (self._state === 1) {
      handleHelper(handler, 'didFulfill', self);
    } else {
      handleHelper(handler, 'didReject', self);
    }
  }

  /**
   * Вспомогательная для then и handle функция, которая запускает функцию-обрабочик
   * для промиса и резолвит новый промис с результатом этой функции
   * или же резолвит новый промис со значение предыдущего промиса, если обрабочик,
   * переданный в then, не является функцией
   *
   * @param  {object} handler - объект с обрабочиками нового промиса и самим промисом
   * @param  {string} cbName - название функции-обработчика
   * @param  {object} self - текущий промис
   * @return {undefined} - функция ничего не возвращает
   *
   */
  function handleHelper (handler, cbName, self) {
    asyncSetTimer(function () {
      if (typeof handler[cbName] === 'function') {
        let res;
        try {
          res = handler[cbName](self._value);
        } catch (e) {
          reject(handler.promise, e);
          return;
        }
        resolve(handler.promise, res);
      } else {
        self._state === 1 ? resolve(handler.promise, self._value) : reject(handler.promise, self._value);
      }
    }, 0);
  }

  /**
   * Функция-резолвер, которая меняет состояние текущего промиса на
   * выполненное успешно и записывает переданное ей значение как его результат
   * разрешения, после чего запускает обработку всех отложенных
   * функций-обработчиков для текущего промиса
   * либо запускает цеполчку промисификации (если переданное значение
   * является thenable объектом)
   *
   * @param  {object} self - текущий промис
   * @param  {any} value - значение,
   * @return {undefined} - функция ничего не возвращает
   *
   */
  function resolve (self, value) {
    const then = getThen(value);
    if (value === self) {
      throw new TypeError('Promise cant be resolved with the same promise');
    }
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

  /**
   * Функция-реджектер, которая меняет состояние текущего промиса на
   * выполненное с ошибкой и записывает переданную ей ошибку как его результат
   * разрешения, после чего запускает обработку всех отложенных функций-обработчиков
   * для текущего промиса
   *
   * @param  {object} self - текущий промис
   * @param  {any} error - ошибка, с которой был отвергнут промис
   * @return {undefined} - функция ничего не возвращает
   *
   */
  function reject (self, error) {
    self._state = state.rejected;
    self._value = error;
    for (let i = 0; i < self._deferreds.length; i++) {
      handle(self, self._deferreds[i]);
    }
    self._deferreds = [];
  }

  /**
   * Функция-исполнитель, запускает механизм резолва/реджекта
   * промиса и следит за тем, чтобы вызов одной из функций происходил
   * только один раз
   *
   * @param  {function} cb - текущий промис
   * @param  {object} self - ошибка, с которой был отвергнут промис
   * @return {undefined} - функция ничего не возвращает
   *
   */
  function doResolve (cb, self) {
    let done = false;
    try {
      cb(function (value) {
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

  /**
   * Конструктор промиса
   *
   * @param  {function} cb - функция обратного вызова
   *
   */
  function MyPromise (cb) {
    if (!(this instanceof MyPromise)) {
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

  /**
   * Функция-обертка над then() для обработки только упавших промисов
   *
   * @param  {function} didReject - функция-обработчик для упавшего промиса
   * @return {object} - возвращает новый промис
   *
   */
  MyPromise.prototype.catch = function (didReject) {
    return this.then(null, didReject);
  };

  /**
   * Функция добавляет обработчики для текущего промиса и возвращает
   * новый промис
   *
   * @param  {function} didFulfill - функция-обработчик для успешного промиса
   * @param  {function} didReject - функция-обработчик для упавшего промиса
   * @return {object} - возвращает новый промис
   *
   */
  MyPromise.prototype.then = function (didFulfill, didReject) {
    const promise = new this.constructor(function () {});
    handle(this, {
      didFulfill: didFulfill,
      didReject: didReject,
      promise: promise
    });
    return promise;
  };

  context.MyPromise = MyPromise;
})(window !== undefined ? window : global);
