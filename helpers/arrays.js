function compressArray(original) {
	let compressed = [];
	// make a copy of the input array
	let copy = original.slice(0);

	// first loop goes over every element
	for (let i = 0; i < original.length; i++) {
		let myCount = 0;
		// loop over every element in the copy and see if it's the same
		for (let w = 0; w < copy.length; w++) {
			if (original[i] == copy[w]) {
				// increase amount of times duplicate is found
				myCount++;
				// sets item to undefined
				delete copy[w];
			}
		}

		if (myCount > 0) {
			let a = new Object();
			a.value = original[i];
			a.count = myCount;
			compressed.push(a);
		}
	}

	return compressed;
}
module.exports = {
	compressArray
};
