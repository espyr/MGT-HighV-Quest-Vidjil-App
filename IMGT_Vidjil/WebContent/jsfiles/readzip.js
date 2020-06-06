readzip.js


var datafile={};

/**
 * Filing the info left panel from the selected parameters file
 * 
 * @param reads //
 *            js object- in vidjil format (germline output)
 * @param data
 *            //line text from parametrs file
 * @returns result // vidjil javascript object
 */
function fillSummary(reads,data){
	let producer1,producer2;
	let retot=0;
	let batches=new Map();
	let info='';
	let read=false;
    let iteration=0;
    let timestamp;
    for(let line of data){
    	// skip the first line
    	iteration++;
    	if(line==''){
    		continue;
    	}
    	if((iteration<10)&&(iteration!=1)) {
    		info+=(info===''?'':'\n')+line[0]+(line.length>1 ? ' '+line[1] : ' ');
    	}
    	if('End date :'==(line[0])){
    		timestamp=line[1];
    	}
    	else if('Total'==(line[0])){
    		info='Total reads: '+line[2]+'\n'+ info;
    		read=false;
    	}
    	else if('#'==(line[0])){
    		read=true;
    		producer1=line[3];
    	}
    	else if(read){
    		// if i am reading the lines between # and Total
    		// for every batch store the Nb of sequences
    		producer2=line[3];
    		if(batches.has(line[1])){
    			// console.log(line)
    			// first time seen batch
    			retot=batches.get(line[1])+parseInt(line[2]);
    			batches.set(line[1],retot);
    		} else
    			batches.set(line[1],parseInt(line[2]));
    	}
    }
	// fill map1 with the information of programm, producer,
	// vidjil_json_version,
	// original_names(batche's names), total(Nb of sequences) and number(nb of
	// batches)

	let result={
		producer: 'program '+producer1+' '+producer2,
		vidjil_json_version: '2016b',
		info: info,
		timestamp: timestamp,
		samples: {
			original_names: [...batches.keys()],
			number: batches.size
		},
		reads: reads,
		clones: []
	};
	result.reads.total=[...batches.values()];
	return result;
}

/**
 * creating js clone objects and filling them with the information from
 * 'pathToExcel' and store all of them to 'myMap'
 * 
 * @param pathToExcel //
 *            (IMGTClonotypes(AA).tsv)
 * @returns myMap // two keys (id and name) for a clone
 */

function readClones(pathToExcel){
	let myMap=new Map();
	let data3=parseCSV(pathToExcel);
	let iteration=0;
	for(let line of data3){
		// skip the first line
		if(iteration==0){
			iteration++;
			continue;
		}
		if(line==''){
			continue;
		}
		let arr=line[18].split(', ');
		let reads=parseInt(line[21]);
		let s={
			// Vidjil fields
			id: removeSpecies(line[5])+' '+removeSpecies(line[13])+' '+line[17],
			germline: line[2],
			reads: [],
			sequence: '',
			name: line[1], // setting value to the object
			top: 1,
			// tag:1,
			// non Vidjil fields
			imgt: {
				clonoClass: line[3],
				vgene: line[5],
				jgene: line[13],
				cdr3AA: line[17],
				anchors: line[18],
				junctionAA: arr[0]+line[17]+arr[1],
				alias: [line[1]]
			}
		};
		s.reads.push(reads);
		// store two times by their name (to recover reads) and by their
		// IMGT key
		myMap.set(s.name,s);
		myMap.set(s.id,s);
	}
	return myMap;
}


/**
 * remove the name of the Species in order to be able to see name of the gene on
 * the table
 * 
 * @param value
 * @returns
 */
function removeSpecies(value){
	let species=value.split(' ');
	return value.replace(new RegExp(species[0],'g'),'').trim();
}

/**
 * create js sequence objects and filling them with the information from 'data'
 * and update 'set'
 * 
 * @param set //
 *            map of the clone objects (myMap)
 * @param data //
 *            (loadedSequences.tsv)
 */
function readSequences(set,data){
	let iteration=0;
	for(let line of data){
		if(iteration==0){
			datafile.seqheader=line;
		}
		iteration++;
		if(line==''||(line.length<=3)||(line[3]=='')){
			continue;
		}
		if(set.has(line[3])){
			let clone=set.get(line[3]);
			if(clone.seg!=null && (clone.seg.junction.productive||line[16]!='productive')){
				continue;
			}else{
				let vlen=line[24];
				let jlen=line[37];
				let clength=line[51];
				let cseq=line[52];
				let splitArray=line[56].split(', ');
				let startof5=parseInt(splitArray[0]);
				let endof3=parseInt(splitArray[1]);
				let endof5=startof5+parseInt(vlen);
				let startof3=endof3-parseInt(jlen);
				let read=line[59]; // corrected read (60 user seq)
				clone.sequence=read.toUpperCase();
				clone.seg={
						5: {
							name: removeSpecies(line[18]),
							start: startof5,
							stop: endof5
						},
						4: {
							name: removeSpecies(line[26])
						},
						3:{
							name: removeSpecies(line[31]),
							start: startof3,
							stop: endof3
						},
						cdr3: {},
						junction: {}
				};
				let exist=read.replace(/\./g,'').indexOf(cseq);
				if(exist>=0){
					let startofc=exist+1;
					clone.seg.cdr3.start=startofc;
					clone.seg.cdr3.stop=startofc+cseq.length-1;
					clone.seg.junction.start=clone.seg.cdr3.start-3;
					clone.seg.junction.stop=clone.seg.cdr3.stop+3;
					clone.seg.junction.productive=line[16]=='productive';
					clone.seg.junction.aa=clone.imgt.junctionAA;
				}else
					console.log('no CDR3 determined for '+clone.name);
			}
		}
	}
}

/**
 * put an 'element' at a given position('index') in the 'list' //if index>length ->
 * fill with 'empty', never outOfBound
 * 
 * @param list //
 *            js array
 * @param index
 * @param element
 * @param empty
 */
function listAt(list,index,element,empty){
	if(empty===undefined)
		empty=0;
	if(index<list.length)
		list.splice(index,0,element);
	else{
		for(let j=list.length;j<index;j++)
			list.push(empty);
		list.push(element);
	}
}

/**
 * parse a 'content' as CSV format
 * 
 * @param content
 *            (multiple line text)
 * @returns data (an 2 dim array (array of arrays of string)
 */
function parseCSV(content){
	return content.split(/\r?\n/).map(function(line){
		return line.split(/\t/);
	});
}

/**
 * it merges into 'map2' all the batch clones from 'bclones' (using their id as
 * a key)
 * 
 * @param map2
 * @param bclones
 * @param i
 */
function merge(map2,bclones,i){
	if(i==0){
		for(const clone of bclones.values()){
			map2.set(clone.id,clone);
		}
	}else{
		// prevent doing the work twice as both clone.id
		// and clone.name are keys of the bclones
		let done=new Set();
		for(let clone of bclones.values())
		if (!done.has(clone.id)){
			if(!map2.has(clone.id)){
				map2.set(clone.id,clone);
				let value=clone.reads[0];
				clone.reads=[];
				clone.imgt.alias=[];
				listAt(clone.reads,i,value);
				listAt(clone.imgt.alias,i,clone.name,'');
			}else{
				let value=clone.reads[0];
				let alias=clone.name;
				clone=map2.get(clone.id);
				listAt(clone.reads,i,value);
				listAt(clone.imgt.alias,i,alias,'');				
			}
			done.add(clone.id);
		}
		for(let leftalone of map2.values()){
			if (leftalone.reads.length==i){
				listAt(leftalone.reads,i,0);
				listAt(leftalone.imgt.alias,i,'','');
			}
		}
	}
}

/**
 * take 'data'
 * 
 * @param data //
 *            using parseCSV return (SummaryIMGTClonotypes(AA))
 * @returns obj with the array of nb of Sequences assigned to IMGT clonotypes
 *          (AA) (summary file) and an obj with the germline (see: vidjil
 *          format)
 */
function germLine(data){
    let iteration=0;
    let firstmap=new Map();
	let listseg=[];
	let i=0;
	// console.log(data)
	for(let line of data){
		// skip the first line
		if(iteration==0){
			iteration++;
			continue;
		}
		if(line==''){
			continue;
		}else if('-'!=line[2]){
			i=parseInt(line[0])-1;
			// if we see the type of locus for the first time, then create an empty list
			if(!firstmap.has(line[2])){
				firstmap.set(line[2],new Array());
			}
			// put in the list the nb of Sequences assigned to IMGT
			// clonotypes (AA) (summary file )
			listAt(firstmap.get(line[2]),i,parseInt(line[5]));
		}else if('Total'==line[0]){
			// insert the value of total from the summary file which is the
			// segmented field in json
			listseg.push(Math.ceil(parseFloat(line[5])));
		}
	}
	for(let list of firstmap.values()){
		if(list.length<i)
			listAt(list,i-1,0);
	}
	let germlines={};
	for(let[k,v] of firstmap.entries()){
		germlines[k]=v;
	}
	return {segmented: listseg, germline: germlines};
}

/**
 * convert an hexadecimal string color spec into an {r,g,b} object.
 * @param hex  
 * @returns object 
 */
function hexToRgb(hex){
	let result=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
	    r: parseInt(result[1],16),
	    g: parseInt(result[2],16),
	    b: parseInt(result[3],16)
	} : null;
}

function ratio(value,fromSource,toSource,fromTarget,toTarget){
	return (value-fromSource)/(toSource-fromSource)*(toTarget-fromTarget)+fromTarget;
}

/**
 * Convert a value between min and max into a color between statColor and endColor.
 * @param value
 * @param min
 * @param max
 * @param startColor hexaxdecimal color
 * @param endColor hexadecimal color
 * @returns
 */
function getColor(value,min,max,startColor,endColor){
	let startRGB=hexToRgb(startColor);
	let endRGB=hexToRgb(endColor);
	let diffRed=endRGB.r-startRGB.r;
	let diffGreen=endRGB.g-startRGB.g;
	let diffBlue=endRGB.b-startRGB.b;
	let percentFade=ratio(value,min,max,0,1);
	return 'rgb('+Math.round((diffRed*percentFade)+startRGB.r)
		+','+Math.round((diffGreen*percentFade)+startRGB.g)
		+','+Math.round((diffBlue*percentFade)+startRGB.b)+')';
}

/**
 * Update color of the clones using a color gradient and their occurrence number between samples.  
 * @param model a Vidjil one
 */
function IMGT_updateColor(model){
	let min=model.clones.length;
	let max=0;
	for(let c of model.clones){
		let value=totalBatches(c);
		if(value<min)min=value;
		if(value>max)max=value;
	}
	for(let c of model.clones){
		let value=totalBatches(c);
		c.color=getColor(value,min,max,'#00FF00','#FF0000');
	}
	// to update the visualization
	model.updateStyle();
}

/**
 * recursive read of the zip starting from batch index 'i'
 * 
 * @param zip
 * @param path //
 *            root of analysis output folder
 * @param data1 //
 *            vidjil js object (fillSummary return)
 * @param clones //
 *            feed by merging all the clones (map -> key:id value:clone)
 * @param i //
 *            increasing in order to read all the batches
 * @param vidjilize //
 *            callback function, once everything has been read
 */
function readBatchData(zip,path,data1,clones,i,vidjilize){
	if(i<data1.samples.original_names.length){
		let l=data1.samples.original_names[i];
		// reader 3 reads IMGTClonotypes(AA) file (gives the path)
		zip.files[path+'/'+l+'/IMGTClonotypes(AA).tsv'].async('text').then(function(txt){
			let bclones=readClones(txt);
			// reader 4 reads loadedSequences file (gives the path)
			zip.files[path+'/'+l+'/loadedSequences.tsv'].async('text').then(function(txt){
				// fill the bclones with the sequence information from loaded
				// sequences file
				readSequences(bclones,parseCSV(txt));
				merge(clones,bclones,i);
				if(i+1<data1.samples.original_names.length){
					readBatchData(zip,path,data1,clones,i+1,vidjilize);
				}else{
					data1.clones=[...clones.values()];
					let x='Total clones: '+clones.size;
					data1.info=x+'\n'+data1.info;
					console.log(data1);
					vidjilize(data1);
				}
			});
		});
	}else
		console.log('empty data?!?');
}

/**
 * read all the files from resultsClono
 * 
 * @param file
 *            //zip file name (given by user )
 * @param vidjilize //
 *            callback function, once everything has been read
 */
function readData(file,vidjilize){
	let jszip=new JSZip();
	jszip.loadAsync(file).then(function(zip){
		let path=file.name.split('/').slice(-1).join().split('.').shift()+'/resultsClono';
		zip.files[path+'/SummaryIMGTClonotypes(AA).tsv'].async('text').then(function(txt){
			let map=germLine(parseCSV(txt));
			// console.log(map);
			let reader1=zip.files[path+'/selected_parameters.txt'];
			reader1.async('text').then(function(txt){
				let data1=fillSummary(map,parseCSV(txt));
				data1.filename=file.name;
				// console.log(data2)
				let clones=new Map();
				readBatchData(zip,path,data1,clones,0,vidjilize);
			});
		});
	});
}

/**
 * calculates the total number of reads for a given 'clone'
 * 
 * @param clone
 * @returns the sum
 */
function totalReads(clone) {
	let sum=0;
	for(let x of clone.reads) sum+=x;
	return sum;
}

/**
 * calculates the total number of appearances for a given 'clone' in all the
 * batches
 * 
 * @param clone
 * @returns the sum
 */
function totalBatches(clone){
	let sum=0;
	for(let x of clone.reads) sum+=(x>0);
	return sum;
}

/**
 * compare 2 numbers
 * 
 * @param a
 * @param b
 * @returns -1(a<b), 0(a=b), 1(a>b)
 */
function cmpInt(a,b){
	return a>b? 1 : (a==b? 0 : -1);
}

/**
 * compares two clones by their class (A,B,C,D) and if equals by the total reads
 * 
 * @param a
 * @param b
 * @returns -1||0|| 1
 */
function cmpClones(a,b){
	let c=-cmpInt(totalReads(a),totalReads(b));
	return c!=0 ? c : a.ClonoClass<b.ClonoClass ? -1 :
		(a.ClonoClass>b.ClonoClass ? 1 : 0);
}

/**
 * compute both min and max clone id lists using different count methods
 * (samples or reads)
 * 
 * @param clones //
 *            array (see: vidjil format)
 * @returns map (key:samples or reads, value:an object with 2 attr (min/max->
 *          list of id clone))
 */
function analysisClones(clones) {
	clones.sort(cmpClones);
	let methods={
			samples: {
				cmp: totalBatches,
				min: null,
				max: null
			},
			reads: {
				cmp: totalReads,
				min: null,
				max: null
			}
	};
	let imgtStat=new Map();
	for(let t in methods){
		imgtStat.set(t, {mins:[], maxs:[]});
	}
	let n=clones.length;
	let i=1;
	for(let clone of clones){
		clone.top=1+Math.floor(i*99/n);
		i++;
		for(let t in methods){
			let f=methods[t].cmp;
			let val=f(clone);
			let stat=imgtStat.get(t);
			if(stat.maxs.length==0){
				stat.maxs.push(clone.id);
				methods[t].max=val;
				stat.mins.push(clone.id);
				methods[t].min=val;
			}else{
				let cmp=cmpInt(val,methods[t].max);
				if(cmp>=0){
					if(cmp>0){
						stat.maxs=[];
						methods[t].max=val;
					}
					stat.maxs.push(clone.id);
				}
				cmp=cmpInt(val,methods[t].min);
				if(cmp<=0){
					if(cmp<0){
						stat.mins=[];
						methods[t].min=val;
					}
					stat.mins.push(clone.id);
				}
			}
		}
	}
	return imgtStat;
}

/**
 * updating all clone tags based on a given 't'
 * 
 * @param clones //
 *            array (see: vidjil format)
 * @param t
 *            (samples or reads)
 */
function updateTags(clones,t){
	let mins=datafile.imgtStat.get(t).mins;
	let maxs=datafile.imgtStat.get(t).maxs;
	for(let clone of clones){
		let isMax=maxs.indexOf(clone.id)>-1;
		let isMin=mins.indexOf(clone.id)>-1;
		clone.tag=isMin?(isMax?4:1):(isMax?3:8);
	}
}

function downloadJSON(content,fileName,contentType){
    let a=document.createElement('a');
    let file=new Blob([content],{type: contentType});
    a.href=URL.createObjectURL(file);
    a.download=fileName;
    a.click();
}

/**
 * loads the files using the vidjil model
 * 
 * @param model //
 *            (see: vidjil API)
 * @param file
 *            //zip file name (given by user )
 * @param limit
 *            //(see: vidjil API)
 */
function loadFile(model,file,limit){
	
	readData(file,function(data){
        // downloadJSON(JSON.stringify(data), 'json.txt', 'text/plain');
	
		datafile.imgtStat=analysisClones(data.clones);
	    model.reset();
        model.parseJsonData(data,limit);
        model.loadGermline()
        	.initClones();
        // model.parseJsonAnalysis(data);
        // model.update_selected_system();
        model.dataFileName=file.name;
	});
}

/**
 * apply the tags and reinitialize the model
 * 
 * @param model//
 *            (see: vidjil API)
 * @param t
 *            (samples or reads)
 */
function applyTag(model,t){
	updateTags(model.clones,t);
	model.init();
}

function setIMGTUI(){
	let head=document.getElementsByTagName('head')[0];
	for(const css_href of ['/vidjil_imgt/css/tabulator.min.css','/vidjil_imgt/css/IMGTtable.css']){
		$(document.createElement('link')).attr({type: 'text/css', href: css_href, rel: 'stylesheet'}).appendTo(head);
	}
	let imgtMenu=`<div class="menu" id="imgt_menu" onmouseover="showSelector('imgtSelector');">IMGT
		<div id="imgtSelector" class="selector">
			<div>
				<div class="menu_box">
					<form onsubmit="searchSequencesByCloneId();return false;"><label for="imgt_search">Reads for</label><input id="imgt_search" type="text" name="filter" placeholder="Clone name..." /></form>
				</div>
				<div class="menu_box">tag min/max by total of<br/>
					<label for="imgtTabByReads" class="buttonSelector" onclick="applyTag(m,'reads');"><input id="imgtTabByReads" type="radio" name="total" />reads</label>
					<!-- <label for="imgtTagBySamples" class="buttonSelector" onclick="applyTag(m,'samples');"><input id="imgtTagBySamples" type="radio" name="total" />batches</label> -->
					<label for="imgtTagBySamples" class="buttonSelector" onclick="IMGT_updateColor(m);"><input id="imgtTagBySamples" type="radio" name="total" />batches</label>
				</div>
			</div>
		</div>
	</div>`;
	$(imgtMenu).insertAfter('#settings_menu');
}

function clearIMGTUI(){
	for(let i of ['#imgt_menu','#seqtable-container']){
		let e=$(i);
		if(e!=null) e.remove();
	}	
}

/**
 * loads zip (given from the user) to a vidjil model
 * 
 * @param model //
 *            (see: vidjil API)
 * @param file_field //
 *            HTML field (for filename)
 * @param analysis
 *            //not used
 * @param limit
 *            //(see: vidjil API)
 * @returns
 */
function load(model,file_field,analysis,limit){
	if(document.getElementById(file_field).files.length>0){
		clearIMGTUI();
		let file=document.getElementById(file_field).files[0];
		if(file.name.endsWith('.zip')){
			loadFile(model,file,limit);
			setIMGTUI();
			datafile.zipfile=file;
		}else{
			model.load(file_field,analysis,limit);
		}
	}
}
