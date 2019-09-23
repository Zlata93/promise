/**
 * примеры использования
 */
var promise = new MyPromise(function (resolve) {
    resolve(42);
});

promise
    .then(function (value) {
        return value + 1;
    })
    .then(function (value) {
        console.log(value); // 43
        return new MyPromise(function (resolve) { resolve(137); });
    })
    .then(function (value) {
        console.log(value); // 137
        throw new Error();
    })
    .then(
        function () { console.log('Будет проигнорировано'); },
        function () { return 'ошибка обработана'; }
    )
    .then(function (value) {
        console.log(value); // "ошибка обработана"
    });

var promise1 = new MyPromise(function (resolve) {
    foo.bar();
    resolve(42);
});

promise1
    .then(function(value) {
    console.log('Не выведется ', value);
    })
    .catch(function (error) {
        console.log('Выведется ', error);
    });
