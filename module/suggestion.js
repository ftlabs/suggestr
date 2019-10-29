const s3Model = require('../models/s3');
const arrayHelper = require('../helpers/arrays');
const objectHelper = require('../helpers/objects');

const returnDataTemplate = {
	descripton: '',
	searchType: '',
	searchParams: {},
	results: [],
	workings: {}
};

async function concepts(params) {
	const data = { ...returnDataTemplate };
	data.searchParams = params;
	data.searchType = `${params.type} search`;
	data.descripton =
		'Provides concept suggestions (as requested in searchType) based on the provided concept(s). Each provided concept is used to search for concepts that are not correlated with it, but still exist in the same cluster, and suggest those concepts as best fit. A query with multiple concepts to search for breaks the query down into seperate searches - only joining together at the end of the process for ranking. Any questions? Please contact myself or ftlabs@ft.com';
	return await multipleConceptRequest(data, params);
}

async function multipleConceptRequest(data, params) {
	const { concepts, exclude, verbose } = params;

	if (!concepts) {
		data.error = 'Concepts query parameter not defined';
		return verboseData(verbose, data, { error: data.error });
	}

	const conceptPromises = concepts.map((concept) => {
		const singleData = { ...returnDataTemplate };
		singleData.searchParams = params;
		singleData.searchType = `${params.type} search`;
		singleData.searchParams.concepts = concept;
		return new Promise(function(resolve, reject) {
			try {
				resolve(singleConceptRequest(singleData, concept, params));
			} catch (error) {
				reject(error);
			}
		});
	});

	return await Promise.all(conceptPromises)
		.then((results) => {
			console.log(' multi search results');
			data.results = results;

			const combinedSortedConceptResults = results
				.filter((entry) => {
					if (entry.workings.nonMatchingTopicsSorted) {
						return entry;
					}
				})
				.map((entry) => {
					return entry.workings.nonMatchingTopicsSorted;
				})
				.sort((a, b) => (a.ratio < b.ratio ? 1 : -1));

			const mergedResults = [].concat.apply([], combinedSortedConceptResults);

			data.workings.nonMatchingTopicsSortedCombined = mergedResults;

			const nonMatchingTopicsSortedCombinedClean = mergedResults.map((entry) => entry.concept_name);
			data.workings.nonMatchingTopicsSortedCombinedClean = nonMatchingTopicsSortedCombinedClean;

			// Rank returned topics if they appear more than once
			// -----
			const ranked = arrayHelper.compressArray(nonMatchingTopicsSortedCombinedClean);

			const rankedCombined = mergedResults.map((entry) => {
				let matched_entry = ranked.filter((sub_entry) => {
					if (sub_entry.value === entry.concept_name) {
						return sub_entry;
					}
				});
				entry.count = matched_entry[0].count;
				return entry;
			});
			data.workings.rankedCombined = rankedCombined;

			// Remove duplicate topics
			// -----
			let uniqueArrayOfObjects = object_helper.uniqueArrayOfObjects(rankedCombined, 'concept_name');
			data.workings.uniqueArrayOfObjects = uniqueArrayOfObjects;

			// Sort by count and then by ratio
			// -----
			const nonMatchingTopicsSorted = object_helper.doubleSort(uniqueArrayOfObjects, 'count', 'ratio');
			data.workings.nonMatchingTopicsSorted = nonMatchingTopicsSorted;

			// Clean the final result to return only the topic names sorted
			// -----
			const nonMatchingTopicsSortedClean = nonMatchingTopicsSorted.map((entry) => entry.concept_name);
			data.workings.nonMatchingTopicsSortedClean = nonMatchingTopicsSortedClean;

			// Remove any concepts on the exclude list
			// -----
			const resultTopics = nonMatchingTopicsSortedClean.filter((entry) => {
				if (!exclude.includes(entry)) {
					return entry;
				}
			});
			data.results = resultTopics;

			console.log('end multi search');

			return verboseData(verbose, data, {
				topics: results
			});
		})
		.catch((error) => {
			data.error = error;
			return verboseData(verbose, data, { error: data.error });
		});
}

async function singleConceptRequest(data, conceptName, params) {
	const { type, clusterSelection, exclude, verbose } = params;
	const resultReturn = { ...data };

	// Load data files
	// -----
	const [conceptClusterList, allCoocs, followUnfollowRatios] = await Promise.all([
		s3Model.getBodyAsJson(`${type}_cluster_${clusterSelection}_list.json`),
		s3Model.getBodyAsJson('allCoocs.json'),
		s3Model.getBodyAsJson(`${type}_ratios.json`)
	]).catch((error) => {
		throw error;
	});

	// Find concept in list
	// -----
	const foundConcept = objectHelper.getFirstMatching(conceptClusterList, 'name', conceptName);
	if (foundConcept === null) {
		throw 'Concept not found';
	}
	resultReturn.clusterGroup = foundConcept.cluster_group;

	// Get all the other concepts with the matching group
	// -----
	const allConceptsInCluster = objectHelper
		.getMatching(conceptClusterList, 'cluster_group', resultReturn.clusterGroup)
		.filter((entry) => entry.name !== conceptName)
		.map((entry) => entry.name);

	// Find the remaining concpets that are not related at all
	// -----
	const allCoocsList = allCoocs[`${type}:${conceptName}`];
	const correlatedConcepts = Object.keys(allCoocsList).map((entry) => entry.replace(`${type}:`, ''));
	const nonOverlappingConcepts = allConceptsInCluster.filter((entry) =>
		!correlatedConcepts.includes(entry) ? entry : null
	);

	resultReturn.workings.allConceptsInCluster = allConceptsInCluster;
	resultReturn.workings.correlatedConcepts = correlatedConcepts;
	resultReturn.workings.allConceptsInCluster = allConceptsInCluster;
	resultReturn.workings.nonOverlappingConcepts = nonOverlappingConcepts;

	if (nonOverlappingConcepts.length <= 0) {
		throw `No non-overlapping ${type} found`;
	}

	// Sort by follow/unfollow ratio
	// -----
	const nonOverlappingConceptsSorted = followUnfollowRatios
		.filter((entry) => (nonOverlappingConcepts.includes(entry.concept_name) ? entry : null))
		.sort((a, b) => (a.ratio < b.ratio ? 1 : -1));

	// Clean the final result to return only the topic names sorted
	// -----
	const nonOverlappingConceptsSortedClean = nonOverlappingConceptsSorted.map((entry) => entry.concept_name);

	// Remove any concepts on the exclude list
	// -----
	const resultConcepts = nonOverlappingConceptsSortedClean.filter((entry) => {
		if (!exclude.includes(entry)) {
			return entry;
		}
	});

	resultReturn.workings.nonOverlappingConceptsSorted = nonOverlappingConceptsSorted;
	resultReturn.workings.nonOverlappingConceptsSortedClean = nonOverlappingConceptsSortedClean;
	resultReturn.results = resultConcepts;

	// Return results
	// -----
	return verboseData(verbose, resultReturn, { concepts: resultConcepts });
}

function verboseData(verbose, data, replacement) {
	return verbose ? data : replacement;
}

module.exports = {
	concepts
};
