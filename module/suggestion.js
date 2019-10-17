const s3_helper = require('../models/s3');

async function topics(topicName) {
	// Set intial variables
	// -----
	const data = {
		type: 'Topic search',
		searchToken: topicName,
		variables: {}
	};

	// Load data files
	// -----
	let topicClusterList;
	let allCoocs;
	let followUnfollowRatios;

	try {
		const clusterListDataFile = await s3_helper.getFile(
			'topic_cluster_list.json'
		);
		const coocsDataFile = await s3_helper.getFile('allCoocs.json');
		const followUnfollowRatiosDataFile = await s3_helper.getFile(
			'topic_ratios.json'
		);

		topicClusterList = JSON.parse(clusterListDataFile.Body.toString());
		allCoocs = JSON.parse(coocsDataFile.Body.toString());
		followUnfollowRatios = JSON.parse(
			followUnfollowRatiosDataFile.Body.toString()
		);
	} catch (err) {
		console.log(err);
		data.error = err;
		return data;
	}

	// Find topic in list
	// -----
	const foundTopic = topicClusterList.filter((entry) =>
		entry.name === topicName ? entry : null
	);

	if (foundTopic.length <= 0) {
		data.error = 'Topic not found';
		return data;
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
		data.error = 'All topics match - no outliers found';
		return data;
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
	return data;
}

module.exports = {
	topics
};
