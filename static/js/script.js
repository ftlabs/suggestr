var urlBuilderForm = document.getElementById('urlBuilder');
var urlBuilderOutput = document.getElementById('urlBuilderOutput');

urlBuilderForm.addEventListener('submit', updateURL, false);

function updateURL(e) {
	e.preventDefault();

	var finalURL = '';
	var urlPreffix = window.location.protocol + '//' + window.location.hostname + '/topics/';
	var searchConcepts = 'concepts=' + urlBuilderForm.searchConcepts.value;
	var excludeConcpets = 'exclude=' + urlBuilderForm.excludeConcpets.value;
	var verbose = 'verbose=' + urlBuilderForm.verbose.value;
	var clusterSelection = 'clusterSelection=' + urlBuilderForm.clusterSelection.value;

	finalURL = encodeURI(
		urlPreffix + '?' + searchConcepts + '&' + excludeConcpets + '&' + verbose + '&' + clusterSelection
	);

	urlBuilderOutput.href = finalURL;
	urlBuilderOutput.innerHTML = finalURL;
	return;
}
