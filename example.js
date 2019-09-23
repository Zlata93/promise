/**
 * примеры использования
 */

/**
 * примеры из задания
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

/**
 * ловим исключение
 */
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

/**
 * имитируем fetch()
 */

function myFetch(url) {
	return new MyPromise(function(resolve, reject) {
		const xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.onload = function() {
			if (this.status == 200) {
				resolve(this.response);
			} else {
				const error = new Error(this.statusText);
				error.code = this.status;
				reject(error);
			}
		};

		xhr.onerror = function() {
			reject(new Error('Something went wrong'));
		};

		xhr.send();
	});
}

// должно успешно подтянуть тудушки
myFetch('https://jsonplaceholder.typicode.com/todos')
	.then(function (res) {
		console.log('res: ', res);
	})
	.catch(function (err) {
		console.log('err: ', err);
	});

// должно кинуть ошибку
myFetch('https://jsonplaceholder.typicode.com/todosпп')
	.then(function (res) {
		console.log('res: ', res);
	})
	.catch(function (err) {
		console.log('err: ', err);
	});
