const adopt = value => value instanceof Promise ? value : Promise.resolve(value)

/**
 * @param {{ generator: Generator, thisObj: ThisType<any>, args: any[] }} param0
 * @returns {Promise<any>}
 */
function awaiter({ generator, thisObj, args }) {
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
