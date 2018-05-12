const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');

const app = express(); 

//Middlware
app.use(bodyParser.json());
app.use(methodOverride('_method')); //lets it know we want to use a query string when we create our form? 19min
app.set('view engine', 'ejs');

app.use(function(req,res,next){
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
	if(req.method === 'OPTIONS') {
		return res.send(204);
	}
	next();
});

//Mongo URI
const mongoURI = 'mongodb://lightsage88:Walruses8@ds161029.mlab.com:61029/9t';


let value;

//create mongo connection
const conn = mongoose.createConnection(mongoURI);


//init gfs
let gfs;

conn.once('open', function(){
	//Init stream
	gfs = Grid(conn.db, mongoose.mongo);
	gfs.collection('uploads');
});

//create storage engine 24:34
const storage = new GridFsStorage({

  url: mongoURI,
  file: (req, file) => {
  	console.log('storage shit');
  	console.log(file);
  	console.log(req.body);
  	console.log(value);
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = file.originalname;
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads',
          category: file.category
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

//@route GET /
//@desc Loads form

app.get('/', (req, res)=>{
	console.log('nomral / running.');
	gfs.files.find().toArray((err, files) => {
		if(!files || files.length === 0) {
			res.render('index', {files:false});
		} else {
			files.map(file => {
				if(file.contentType ==='image/jpeg' || file.contentType === 'image/png') {
					file.isImage = true;
				} else {
					file.isImage = false;
				}
			});
			res.render('index', {files: files});
		}
	});
});



//@route POST /upload
//@desc Uploads file to DB
app.post('/upload', upload.single('file'), (req,res)=>{
	let {category} = req.body;
	value = category;
	res.json({file: req.file});
	// res.redirect('/');
});

// app.post('/uploadMulti', upload.array('files',100), async(req,res))

//@route GET  /files
//@desc display all files in json
app.get('/files', (req,res)=>{
	gfs.files.find().toArray((err, files)=>{
		//check if fiels exist
		if(!files || files.length === 0){
			return res.status(404).json({
				err: 'No files exist'
			});
		}
		return res.json(files);
	})
})

//@route GET /files/:filename
//@desc Display particular file in JSON
app.get('/files/:filename', (req,res)=> {
	gfs.files.findOne({filename: req.params.filename}, (err, file)=>{
		if(!file || file.length === 0) {
			return res.status(404).json({
				err: 'No file exists'
			});
		}
		return res.json(file);
	});
});

//@route GET /image/:filename
//@desc Display single image!
app.get('/image/:filename', (req,res)=> {
	gfs.files.findOne({filename: req.params.filename}, (err, file)=>{
		if(!file || file.length === 0) {
			return res.status(404).json({
				err: 'No file exists'
			});
		}
		//check if image
		if(file.contentType === 'image/jpeg' || file.contentType ==='image/png'){
			//read output of stream to browser
			const readstream = gfs.createReadStream(file.filename);
			readstream.pipe(res);
		} else {
			res.status(404).json({err:'Not an image'});
		}
	});
});





const port = 5000;

app.listen(process.env.PORT || port, ()=>console.log(`Server started on port ${port}`));