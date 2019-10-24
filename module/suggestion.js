const s3_model = require('../models/s3');
const array_helper = require('../helpers/arrays');
const object_helper = require('../helpers/objects');

async function topics(topics, verbose) {
	if (Array.isArray(topics)) {
		return await multipleTopicRequest(topics, verbose);
	} else {
		return await singleTopicRequest(topics, verbose);
	}
}

async function singleTopicRequest(topicName, verbose) {
	// Set intial variables
	// -----
	const data = {
		type: 'Topic search',
		searchToken: topicName,
		descripton: "...",
		nonMatchingTopicsSortedClean : [],
		variables: {}
	};

	// Load data files
	// -----
	let topicClusterList;
	let allCoocs;
	let followUnfollowRatios;

	try {
		const clusterListDataFile = await s3_model.getFile(
			'topic_cluster_list.json'
		);
		const coocsDataFile = await s3_model.getFile('allCoocs.json');
		const followUnfollowRatiosDataFile = await s3_model.getFile(
			'topic_ratios.json'
		);

		topicClusterList = JSON.parse(clusterListDataFile.Body.toString());
		allCoocs = JSON.parse(coocsDataFile.Body.toString());
		followUnfollowRatios = JSON.parse(
			followUnfollowRatiosDataFile.Body.toString()
		);
	} catch (err) {
		data.error = err;
		return verboseData(verbose, data, { error: err });
	}

	// Find topic in list
	// -----
	const foundTopic = topicClusterList.filter((entry) =>
		entry.name === topicName ? entry : null
	);

	if (foundTopic.length <= 0) {
		const err = 'Topic not found';
		data.error = err;
		return verboseData(verbose, data, { error: err });
	}

	const foundTopicSingle = foundTopic[0];
	const foundTopicClusterNo = foundTopicSingle.cluster_group;
	data.clusterNumber = foundTopicClusterNo;

	// Get all the other topics with the matching group
	// -----
	const allTopicsInCluster = topicClusterList
		.filter(function(entry) {
			if (
				entry.cluster_group === foundTopicClusterNo &&
				entry.name !== topicName
			) {
				return entry;
			}
		})
		.map(function(entry) {
			return {
				name: entry.name,
				cluster_group: entry.cluster_group
			};
		});

	data.variables.allTopicsInCluster = allTopicsInCluster;

	// Get the list of correlated content
	// -----
	const correlatedTopics = allCoocs[`topics:${topicName}`];
	data.variables.correlatedTopics = correlatedTopics;

	// Find the remaining topics that are not related at all
	// -----
	const allTopicsInClusterArr = allTopicsInCluster.map((entry) => entry.name);
	data.variables.allTopicsInClusterArr = allTopicsInClusterArr;

	const correlatedTopicsArr = Object.keys(correlatedTopics).map((entry) =>
		entry.replace('topics:', '')
	);
	data.variables.correlatedTopicsArr = correlatedTopicsArr;

	const nonMatchingTopics = allTopicsInClusterArr.filter((entry) =>
		!correlatedTopicsArr.includes(entry) ? entry : null
	);
	data.variables.nonMatchingTopics = nonMatchingTopics;

	if (nonMatchingTopics.length <= 0) {
		data.error = 'No non-matching topics found';
		return verboseData(verbose, data, { error: data.error });
	}

	// Sort by follow/unfollow ratio
	// -----
	const nonMatchingTopicsSorted = followUnfollowRatios
		.filter((entry) =>
			nonMatchingTopics.includes(entry.concept_name) ? entry : null
		)
		.sort((a, b) => (a.ratio < b.ratio ? 1 : -1));
	data.variables.nonMatchingTopicsSorted = nonMatchingTopicsSorted;

	// Clean the final result to return only the topic names sorted
	// -----
	const nonMatchingTopicsSortedClean = nonMatchingTopicsSorted.map(
		(entry) => entry.concept_name
	);
	data.nonMatchingTopicsSortedClean = nonMatchingTopicsSortedClean;

	// Return results
	// -----
	return verboseData(verbose, data, { topics: nonMatchingTopicsSortedClean });
}

async function multipleTopicRequest(topicNames, verbose) {
	const topicsRequested = topicNames;
	const data = {
		type: 'Topic search - multiple',
		searchToken: topicsRequested,
		descripton: "...",
		nonMatchingTopicsSortedClean : [],
		variables: {}
	};

	if (!topicsRequested) {
		data.error = 'Topics query parameter not defined';
		return verboseData(verbose, data, { error: data.error });
	}

	const topics = topicNames;
	const topicPromises = [];
	topics.map((topic) => {
		new Promise(function(resolve, reject) {
			topicPromises.push(singleTopicRequest(topic, true));
		});
	});

	const multiTopicPromise = Promise.all(topicPromises)
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
			const ranked = array_helper.compressArray(
				nonMatchingTopicsSortedCombinedClean
			);

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
			let uniqueArrayOfObjects = object_helper.uniqueArrayOfObjects(
				rankedCombined,
				'concept_name'
			);
			data.uniqueArrayOfObjects = uniqueArrayOfObjects;

			// Sort by count and then by ratio
			// -----
			const nonMatchingTopicsSorted = object_helper.doubleSort(
				uniqueArrayOfObjects,
				'count',
				'ratio'
			);
			data.nonMatchingTopicsSorted = nonMatchingTopicsSorted;

			// Clean the final result to return only the topic names sorted
			// -----
			const nonMatchingTopicsSortedClean = nonMatchingTopicsSorted.map(
				(entry) => entry.concept_name
			);
			data.nonMatchingTopicsSortedClean = nonMatchingTopicsSortedClean;

			return verboseData(verbose, data, {
				topics: nonMatchingTopicsSortedClean
			});
		})
		.catch((error) => {
			data.error = error;
			return verboseData(verbose, data, { error: data.error });
		});

	return await multiTopicPromise;
}

function verboseData(verbose, data, replacement) {
	return verbose ? data : replacement;
}

module.exports = {
	topics
};
