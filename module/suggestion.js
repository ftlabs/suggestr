const s3Model = require('../models/s3');
const arrayHelper = require('../helpers/arrays');
const objectHelper = require('../helpers/objects');

const returnDataTemplate = {
	description: '',
	summary: '',
	searchType: '',
	searchParams: {},
	status: {},
	results: [],
	workings: {}
};

async function concepts(params) {
	const data = { ...returnDataTemplate };
	data.searchParams = params;
	data.searchType = `${params.type} search`;
	data.description =
		'Provides concept suggestions, type of concept specified in searchType, based on the provided concept(s). Each provided concept is used to search for concepts that are not correlated with it, but still exist in the same cluster, and suggest those concepts as best fit. A query with multiple concepts to search for breaks the query down into separate searches - only joining together at the end of the process for ranking.';
	data.summary =
		'An explaination on how the concepts are suggested is located in this repositieds readme (https://github.com/ftlabs/suggestr). Any questions? Please contact myself or ftlabs@ft.com';
	return await multipleConceptRequest(data, params);
}

async function multipleConceptRequest(data, params) {
	const { concepts, exclude, verbose } = params;
	const multiData = { ...data };

	if (!concepts) {
		multiData.error = 'Concepts query parameter not defined, please provide concept(s) to begin a search';
		return verboseData(verbose, data, { status: multiData.error });
	}

	const conceptPromises = concepts.map((concept) => {
		const singleData = { ...returnDataTemplate };
		singleData.searchParams = params;
		singleData.searchType = `${params.type} search`;

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
			multiData.subqueries = results;

			const subqueryClusters = results.map((entry) => {
				return {
					name: entry.searchParams.concepts,
					clusterGroup: entry.clusterGroup
				};
			});

			const subqueryStatus = results.map((entry) => entry.status);
			const noResultQueries = subqueryStatus
				.filter((entry) => {
					if (entry.completion == 'noresults') {
						return entry;
					}
				})
				.map((entry) => {
					return {
						name: entry.name,
						type: params.type,
						message: entry.message
					};
				});
			const noResultQueriesStatus = {
				msg: `${subqueryStatus.length - noResultQueries.length} query(s) passed, ${
					noResultQueries.length
				} query(s) with no results`,
				noResultQueries
			};

			multiData.subqueryClusters = subqueryClusters;
			multiData.numberOfResultsFailed = noResultQueries.length;
			multiData.status = noResultQueriesStatus;

			const combinedSortedConceptResults = results
				.filter((entry) => {
					if (entry.workings.nonOverlappingConceptsSorted) {
						return entry;
					}
				})
				.map((entry) => {
					return entry.workings.nonOverlappingConceptsSorted;
				})
				.sort((a, b) => (a.ratio < b.ratio ? 1 : -1));

			const nonMatchingConceptsSortedCombined = [].concat.apply([], combinedSortedConceptResults);
			const nonMatchingConceptsSortedCombinedClean = nonMatchingConceptsSortedCombined.map(
				(entry) => entry.concept_name
			);

			// Rank returned concepts if they appear more than once
			// -----
			const ranked = arrayHelper.compressArray(nonMatchingConceptsSortedCombinedClean);
			const rankedCombined = nonMatchingConceptsSortedCombined.map((entry) => {
				let matched_entry = ranked.filter((sub_entry) => {
					if (sub_entry.value === entry.concept_name) {
						return sub_entry;
					}
				});
				entry.count = matched_entry[0].count;
				return entry;
			});

			// Remove duplicate concepts
			// -----
			let uniqueArrayOfObjects = objectHelper.uniqueArrayOfObjects(rankedCombined, 'concept_name');

			// Sort by count and then by ratio
			// -----
			const nonMatchingConceptsSorted = objectHelper.doubleSort(uniqueArrayOfObjects, 'count', 'ratio');

			// Remove any concepts on the exclude list
			// -----
			const nonMatchingConceptsSortedTidy = nonMatchingConceptsSorted.filter((entry) => {
				if (!exclude.includes(entry.name)) {
					return entry;
				}
			});

			// Clean the final result to return only the concept names sorted
			// -----
			const nonMatchingConceptsSortedTidyRanked = siftResults(
				nonMatchingConceptsSortedTidy,
				results.length,
				false
			);
			const nonMatchingConceptsSortedTidyRankedClean = siftResults(
				nonMatchingConceptsSortedTidy,
				results.length,
				true
			);

			multiData.workings = {
				nonMatchingConceptsSortedCombined,
				nonMatchingConceptsSortedCombinedClean,
				rankedCombined,
				uniqueArrayOfObjects,
				nonMatchingConceptsSorted,
				nonMatchingConceptsSortedTidy,
				nonMatchingConceptsSortedTidyRanked,
				nonMatchingConceptsSortedTidyRankedClean
			};

			multiData.results = nonMatchingConceptsSortedTidyRankedClean;

			if (
				nonMatchingConceptsSortedTidyRankedClean.best.length === 0 &&
				nonMatchingConceptsSortedTidyRankedClean.other.length === 0
			) {
				return verboseData(verbose, multiData, {
					results: nonMatchingConceptsSortedTidyRankedClean,
					status: noResultQueriesStatus
				});
			}

			return verboseData(verbose, multiData, {
				results: nonMatchingConceptsSortedTidyRankedClean
			});
		})
		.catch((error) => {
			multiData.status = status;
			return verboseData(verbose, multiData, { status: multiData.status });
		});
}

async function singleConceptRequest(data, conceptName, params) {
	const { type, clusterSelection, exclude } = params;
	const resultReturn = { ...returnDataTemplate };

	resultReturn.searchParams = { ...data.searchParams };
	resultReturn.searchParams.concepts = conceptName;

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
	const foundConcept = objectHelper.getMatching(conceptClusterList, 'name', conceptName)[0];
	if (foundConcept === null || foundConcept === undefined) {
		const nonCompletionMsg = 'No concept found with that name, please check the spelling';
		resultReturn.status = statusObj(0, conceptName, nonCompletionMsg);
		return resultReturn;
	}
	resultReturn.clusterGroup = foundConcept.cluster_group;

	// Get all the other concepts with the matching group
	// -----
	const allConceptsInCluster = objectHelper
		.getMatching(conceptClusterList, 'cluster_group', resultReturn.clusterGroup)
		.filter((entry) => entry.name !== conceptName)
		.map((entry) => entry.name);

	// Find the remaining concepts that are not related at all
	// -----
	const allCoocsList = allCoocs[`${type}:${conceptName}`];
	const correlatedConcepts = Object.keys(allCoocsList).map((entry) => entry.replace(`${type}:`, ''));
	const nonOverlappingConcepts = allConceptsInCluster.filter((entry) =>
		!correlatedConcepts.includes(entry) ? entry : null
	);

	if (nonOverlappingConcepts.length <= 0) {
		const nonCompletionMsg = `No non-overlapping ${type} found. This means that: the searched topic is part of cluster ${foundConcept.cluster_group}, all the other topics in this cluster correlate to ${conceptName} in some manner, so (with this algorithm) there are no nonOverlapping concepts to suggest.`;
		resultReturn.status = statusObj(0, conceptName, nonCompletionMsg);
		return resultReturn;
	}

	// Sort by follow/unfollow ratio
	// -----
	const nonOverlappingConceptsSorted = followUnfollowRatios
		.filter((entry) => (nonOverlappingConcepts.includes(entry.concept_name) ? entry : null))
		.sort((a, b) => (a.ratio < b.ratio ? 1 : -1));

	// Clean the final result to return only the concept names sorted
	// -----
	const nonOverlappingConceptsSortedClean = nonOverlappingConceptsSorted.map((entry) => entry.concept_name);

	// Remove any concepts on the exclude list
	// -----
	const resultConcepts = nonOverlappingConceptsSortedClean.filter((entry) => {
		if (!exclude.includes(entry)) {
			return entry;
		}
	});

	resultReturn.workings = {
		allConceptsInCluster,
		correlatedConcepts,
		allConceptsInCluster,
		nonOverlappingConcepts,
		nonOverlappingConceptsSorted,
		nonOverlappingConceptsSortedClean
	};

	resultReturn.status = statusObj(1, conceptName);
	resultReturn.results = resultConcepts;

	// Return results
	// -----
	return resultReturn;
}

function verboseData(verbose, data, replacement) {
	return verbose ? data : replacement;
}

function statusObj(completion, name, message = '') {
	let completionMsg = '';
	switch (completion) {
		case 1:
			completionMsg = 'success';
			break;
		case 0:
		default:
			completionMsg = 'noresults';
	}
	return { completion: completionMsg, name, message };
}

function siftResults(results, searchCount, clean) {
	const best = results
		.filter((entry) => {
			if (entry.count === searchCount) {
				return entry;
			}
		})
		.map((entry) => {
			if (clean) {
				return entry.concept_name;
			}
			return entry;
		});

	const other = results
		.filter((entry) => {
			if (entry.count !== searchCount) {
				return entry;
			}
		})
		.map((entry) => {
			if (clean) {
				return entry.concept_name;
			}
			return entry;
		});

	return {
		best,
		other
	};
}

module.exports = {
	concepts
};
