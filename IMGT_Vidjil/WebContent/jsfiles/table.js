table.js


/** (recursively) parses the loadedSequences.tsv
 * @param file //zip file
 * @param filepath // root of analysis output folder
 * @param origNames // array of batch names
 * @param filterFunc //Function is a predicate, to test each element of the array (see: Array.prototype.filter())
 * @param i // increasing in order to read all the batches
 * @param result // array of sequence record objects in order to feed the HTML table
 * @param callBackFunc // callback function, once everything has been read
 */
function filtering(file,filepath,origNames,filterFunc,i,result,callBackFunc){
	if(i<origNames.length){
		let l=origNames[i];
		file.files[filepath+'/'+l+'/loadedSequences.tsv'].async('text').then(function(txt){
			let filtered=parseCSV(txt);
			filtered.splice(0,1);
			filtered=filtered.filter(filterFunc).map(createSequence);
			for(let x of filtered){
				result.push(x);
			}
			if(i+1<origNames.length){
				filtering(file, filepath,origNames,filterFunc,i+1,result,callBackFunc);
			}else{
				callBackFunc(result);
			}
		});
	}
}


/** create the table with all the information from the csv file using as id the V,the J and the junction
 * @param tabledata // array of sequence record objects in order to feed the HTML table
 */
function table(tabledata){
	let columns=[{
			title: datafile.seqheader[1],
			field: 'a1',
			editor: 'input',
			headerFilter: 'input'
		}, {
			title: datafile.seqheader[3],
			field: 'a3',
			editor: 'input',
			headerFilter: 'input'
		}, {
			title: datafile.seqheader[18],
			field: 'a18',
			editor: 'input',
			headerFilter: 'input'
		}, {
			title: datafile.seqheader[31],
			field: 'a31',
			editor: 'input',
			headerFilter: 'input'
		}, {
			title: datafile.seqheader[56],
			field: 'a56',
			editor: 'input',
			headerFilter: 'input'
		}, {
			title: 'Junction',
			field: 'junctionAA',
			editor: 'input',
			headerFilter: 'input'
		}, {
			title: datafile.seqheader[52],
			field: 'a52',
			editor: 'input',
			headerFilter: 'input'
		}
	];
	let i=0;
	for(let r of datafile.seqheader){
		let fieldname='a'+i;
		if(!columns.find(function(e){return e.field==fieldname;})){
			columns.push({
				title: r,
				field: fieldname,
				editor: 'input',
				headerFilter: 'input'
			});
		}
		for(let row of tabledata){
			row[fieldname]=row.line[i];
		}
		i++;
	}
	// create x button (jQuery)
	let close_span=$('<button class="close_div" title="Close Tab" onclick="$(\'#seqtable-container\').remove();">&#10006</button>')[0];
	let table=new Tabulator('#seqtable', {
		data: tabledata,           // load row data from array
		// layout: "fitColumns", //fit columns to width of table
		// responsiveLayout: "hide", //hide columns that dont fit on the table
		tooltips: true,            // show tool tips on cells
		addRowPos: 'top',          // when adding a new row, add it to the top
									// of the table
		history: true,             // allow undo and redo actions on the table
		pagination: 'local',       // paginate the data
		paginationSize: 4,         // allow 7 rows per page of data
		movableColumns: true,      // allow column order to be changed
		// footerElement: close_span, //  
		resizableRows: true,       // allow row order to be changed
		initialSort: [{            // set the initial sort order of the data
			column: 'a1',
			dir: 'asc'
		}],
		columns: columns
	});
	//insert x button 
	$('.tabulator-footer').append(close_span);
}


/** parse one sequence file line (definition of the sequence with name of the V the name of the J and the CDR3 with the anchors
 * @param line // array of strings
 * @returns a sequence record object
 */
function createSequence(line){
	let arr=line[49].split(', ');
	return {
			line: line,
			junctionAA: arr[0]+line[48]+ arr[1],
			IMGTid: removeSpecies(line[18])+' '+removeSpecies(line[31])+' '+line[48]
    };
}


/**display the HTML table by filtering the zip file on a given a callback 'filterFunc'
 * @param file // zip file name
 * @param filterFunc //Function is a predicate, to test each element of the array (see: Array.prototype.filter())
 * @param originalNames // array of batch names
 */
function readFiltering(file,filterFunc,originalNames){
	console.log('csearching in '+file.name);
	let jszip=new JSZip();
	jszip.loadAsync(file).then(function(zip){
		let path=file.name.split('/').slice(-1).join().split('.').shift()+'/resultsClono';
		console.log('searching in '+originalNames);
		filtering(zip,path,originalNames,filterFunc,0,[],function(data){
			console.log(data);
			// refresh the table when change seq search (not disapper and creat it again, but clean and refresh)
			for(let i of ['#seqtable-container']){
				//use JQuery in order to retrieve the content of html
				let e=$(i);
				if(e!=null) e.remove();
			}	
			$('<div id="seqtable-container"><div id="seqtable"></div></div>').insertAfter('#mid-container');
			table(data);
		});
	});
}

/**search for sequences by CloneId using field (HTML id: 'imgt_search') value
 * @param event // HTML event not used
 */
function searchSequencesByCloneId(event){
	let ref=$('#imgt_search').val();
	let clone=m.clones.find(function(e){return e.name==ref;});
	console.log('ref='+ref+' clone='+clone);
	readFiltering(datafile.zipfile,function(line){
		return typeof line[3]!=='undefined' && createSequence(line).IMGTid==clone.id;
	},m.samples.original_names);
}
