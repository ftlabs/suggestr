const express = require('express');
const router = express.Router();
const suggestion = require('../module/suggestion');

const supportedClusterSelections = ['3', '5', '10', '20'];
const defaults = {
	clusterSelection: '20',
	concepts: '',
	excludes: [],
	type: 'topics',
	verbosity: true
};

router.get('/', async (req, res) => {
	const searchParams = {
		clusterSelection:
			req.query.clusterSelection && supportedClusterSelections.includes(req.query.clusterSelection)
				? req.query.clusterSelection
				: defaults.clusterSelection,
		concepts: req.query.concepts ? req.query.concepts.split(',') : defaults.concepts,
		exclude: req.query.exclude ? req.query.exclude.split(',') : defaults.excludes,
		type: defaults.type,
		verbose: req.query.verbose ? req.query.verbose === 'true' : defaults.verbosity
	};
	const result = await suggestion.concepts(searchParams);
	res.status(200).json(result);
	return;
});

module.exports = router;
