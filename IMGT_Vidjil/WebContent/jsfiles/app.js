app.js


// For the IMGT side
requirejs.config({
    'baseUrl': '/vidjil_imgt/jsfiles/',
    'paths': {
        'app': ''
    }
});
var JSZip;
var Tabulator;
require(['lib/jszip.min','lib/tabulator.min'],function(jszip,tabulator){
	JSZip=jszip;
	Tabulator=tabulator;
	require(['readzip','table'],function(readzip,table){
		// not use the vidjil function to upload - use IMGT's
		$('#start_import_json').attr('onclick','').unbind('click');
		var t0 = performance.now();
			$('#start_import_json').on('click',function(){
			document.getElementById('file_menu').style.display='none';
			load(m,'upload_json','upload_pref',200);
			  var t1 = performance.now();
				console.log("Time to load, to read and to create the JSON file  " + (t1 - t0) + " milliseconds.");
		});
	});
});
