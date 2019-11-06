var urlBuilderForm = document.getElementById('urlBuilder');
var urlBuilderOutput = document.getElementById('urlBuilderOutput');

urlBuilderForm.addEventListener('submit', updateURL, false);

function updateURL(e) {
	e.preventDefault();

	var finalURL = '';
	var urlPreffix = urlPreffixGen('topics');
	var searchConcepts = 'concepts=' + encodeURIComponent(urlBuilderForm.searchConcepts.value);
	var excludeConcpets = 'exclude=' + encodeURIComponent(urlBuilderForm.excludeConcpets.value);
	var verbose = 'verbose=' + urlBuilderForm.verbose.value;
	var clusterSelection = 'clusterSelection=' + urlBuilderForm.clusterSelection.value;

	finalURL = urlPreffix + '?' + searchConcepts + '&' + excludeConcpets + '&' + verbose + '&' + clusterSelection;

	urlBuilderOutput.href = finalURL;
	urlBuilderOutput.innerHTML = finalURL;
	return;
}

function urlPreffixGen(type) {
	var protocol = window.location.protocol + '//';
	var hostname = window.location.hostname;
	var portStr = ':' + window.location.port;
	var port = window.location.port ? portStr : '';
	var path = '/' + type + '/';
	return encodeURI(protocol + hostname + port + path);
}
