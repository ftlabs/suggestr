function getMatching(arrayOfObjs, matchProperty, matchValue) {
	return arrayOfObjs.filter((entry) => {
		return entry[matchProperty] === matchValue ? entry : null;
	});
}

function doubleSort(arrayOfObjs, sortProperty1, sortProperty2) {
	return arrayOfObjs.sort(function(object1, object2) {
		if (object1[sortProperty1] > object2[sortProperty1]) return -1;
		if (object1[sortProperty1] < object2[sortProperty1]) return 1;
		if (object1[sortProperty2] < object2[sortProperty2]) return 1;
		if (object1[sortProperty2] > object2[sortProperty2]) return -1;
		return 0;
	});
}

function uniqueArrayOfObjects(arrayOfObjs, unique_name) {
	return arrayOfObjs.filter(function(obj, index, self) {
		return (
			index ===
			self.findIndex(function(t) {
				return t[unique_name] === obj[unique_name];
			})
		);
	});
}

module.exports = {
	getMatching,
	doubleSort,
	uniqueArrayOfObjects
};
