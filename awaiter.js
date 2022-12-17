function awaiter({ thisObj, args, generator }) {
	function adopt(value) {
		if (value instanceof Promise) {
			return value
		}
		return Promise.resolve(value)
	}

	return new Promise((resolve, reject) => {
		function handler({ fulfilled }) {
			try {
				if (fulfilled) {
					step(generator.next(value))
					return
				}
				step(generator.throw(value))
			} catch (error) {
				reject(error)
			}
		}

		function step(result) {
			if (result.done) {
				resolve(result.value)
				return
			}
			adopt(result.value).then(
				() => handler({ fulfilled: true  }),
				() => handler({ fulfilled: false })
			)
		}
		step(generator.apply(thisObj, args ?? []).next())
	})
}

module.exports = { awaiter }