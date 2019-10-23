const express = require('express');
const router = express.Router();
const suggestion = require('../module/suggestion');

router.get('/:topicName', async (req, res) => {
	const result = await suggestion.topics(req.params.topicName);
	res.status(200).json(result);
	return;
});

router.get('/', async (req, res) => {
	const topicsRequested = req.query.topics;
	const data = {
		type: 'Topic search - multiple',
		searchToken: topicsRequested,
		variables: {}
	};

	if (!topicsRequested) {
		data.error = 'Topic query parameter not defined';
		res.status(200).json(data);
		return;
	}

	const topics = req.query.topics.split(',');
	const topicPromises = [];
	topics.map((topic) => {
		new Promise(function(resolve, reject) {
			topicPromises.push(suggestion.topics(topic));
		});
	});

	Promise.all(topicPromises)
		.then((results) => {
			data.results = results;

			const combined_sorted_topic_results = results
				.filter((entry) => {
					if (entry.variables.nonMatchingTopicsSorted) {
						return entry;
					}
				})
				.map((entry) => {
					return entry.variables.nonMatchingTopicsSorted;
				})
				.sort((a, b) => (a.ratio < b.ratio ? 1 : -1));

			const mergedResults = [].concat.apply(
				[],
				combined_sorted_topic_results
			);

			data.nonMatchingTopicsSortedCombined = mergedResults;

			const nonMatchingTopicsSortedCombinedClean = mergedResults.map(
				(entry) => entry.concept_name
			);
			data.nonMatchingTopicsSortedCombinedClean = nonMatchingTopicsSortedCombinedClean;

			// Rank returned topics if they appear more than once
			// -----
			const ranked = compressArray(nonMatchingTopicsSortedCombinedClean);

			const rankedCombined = mergedResults.map((entry) => {
				let matched_entry = ranked.filter((sub_entry) => {
					if (sub_entry.value === entry.concept_name) {
						return sub_entry;
					}
				});
				entry.count = matched_entry[0].count;
				return entry;
			});
			data.rankedCombined = rankedCombined;

			// Remove duplicate topics
			// -----
			var uniqueArrayOfObjects = rankedCombined.filter(function(
				obj,
				index,
				self
			) {
				return (
					index ===
					self.findIndex(function(t) {
						return t['concept_name'] === obj['concept_name'];
					})
				);
			});

			data.uniqueArrayOfObjects = uniqueArrayOfObjects;

			// Sort by count and then by ratio
			// -----
			const nonMatchingTopicsSorted = uniqueArrayOfObjects.sort(function(
				vote1,
				vote2
			) {
				if (vote1.count > vote2.count) return -1;
				if (vote1.count < vote2.count) return 1;
				if (vote1.ratio < vote2.ratio) return 1;
				if (vote1.ratio > vote2.ratio) return -1;
			});

			data.nonMatchingTopicsSorted = nonMatchingTopicsSorted;

			// Clean the final result to return only the topic names sorted
			// -----
			const nonMatchingTopicsSortedClean = nonMatchingTopicsSorted.map(
				(entry) => entry.concept_name
			);
			data.nonMatchingTopicsSortedClean = nonMatchingTopicsSortedClean;

			res.status(200).json(data);
			return;
		})
		.catch((error) => {
			data.error = error;
			res.status(200).json(data);
			return;
		});

	return;
});

function compressArray(original) {
	var compressed = [];
	// make a copy of the input array
	var copy = original.slice(0);

	// first loop goes over every element
	for (var i = 0; i < original.length; i++) {
		var myCount = 0;
		// loop over every element in the copy and see if it's the same
		for (var w = 0; w < copy.length; w++) {
			if (original[i] == copy[w]) {
				// increase amount of times duplicate is found
				myCount++;
				// sets item to undefined
				delete copy[w];
			}
		}

		if (myCount > 0) {
			var a = new Object();
			a.value = original[i];
			a.count = myCount;
			compressed.push(a);
		}
	}

	return compressed;
}

module.exports = router;
