const express = require('express');
const router = express.Router();
const suggestion = require('../module/suggestion');

const supportedClusterSelections = ['3', '5', '10', '20'];

const defaultClusterSelection = '20';
const defaultConcepts = '';
const defaultExcludes = [];
const defaultType = 'topics';
const defaultVerbosity = true;

router.get('/', async (req, res) => {
	const searchParams = {
		clusterSelection:
			req.query.clusterSelection && supportedClusterSelections.includes(req.query.clusterSelection)
				? req.query.clusterSelection
				: defaultClusterSelection,
		concepts: req.query.concepts ? req.query.concepts.split(',') : defaultConcepts,
		exclude: req.query.exclude ? req.query.exclude.split(',') : defaultExcludes,
		type: defaultType,
		verbose: req.query.verbose ? req.query.verbose === 'true' : defaultVerbosity
	};
	const result = await suggestion.concepts(searchParams);
	res.status(200).json(result);
	return;
});

module.exports = router;
