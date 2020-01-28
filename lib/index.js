var path = require('path');
var unzip = require('unzip');
var knox = require('knox');
var through = require('through');
var MultiPartUpload = require('knox-mpu');

var unzipToS3 = {};
var internals = {};

internals._validateOptions = function (options) {
  if (!options.key) throw new Error('aws key required');
  if (!options.secret) throw new Error('aws secret required');
  if (!options.bucket) throw new Error('aws bucket required');
  
  if(options.path === undefined) {
    options.path = '/';
  }
  
  return options;
};

internals._buildFileObject = function (file, data) {
  file.location = data.Location;
  file.bucket = data.Bucket;
  file.key = data.Key;
  file.etag = data.ETag;
  file.size = data.size;
  
  return file;
};

internals._createClient = function (options) {
  return knox.createClient({
    key: options.key,
    secret: options.secret,
    bucket: options.bucket,
    token: options.token,
    region: options.region
  });
};

internals.unzipFiles = function (zipStream) {
  var stream = through();
  
  zipStream.pipe(unzip.Parse()).on('entry', function (file) {
    if (file.type === 'File') {
      return stream.emit('data', file);
    }
    
    file.autodrain();
  }).on('finish', function() {
    stream.emit('end');
  });
  
  return stream;
};

internals.uploadFiles = function(client, returnStream, dirPath) {
  return through(function (file) {
    dirPath = dirPath || '/';
    var fullPath = path.join(dirPath, file.path);
    var upload = new MultiPartUpload({
        client: client,
        objectName: fullPath,
        stream: file
      }, function(err, body) {
        if (err) {
          return returnStream.emit('error', err);
        }
        returnStream.emit('data', internals._buildFileObject(file, body));
    });
  });
};

internals.streamWithOptions = function (options) {
  var dirPath = options.path;
  
  return function (zipStream) {
    var fileStream = through();
    var client = internals._createClient(options);
    
    internals.unzipFiles(zipStream)
      .pipe(internals.uploadFiles(client, fileStream, dirPath));
    
    return fileStream;
  };
};


unzipToS3.createClient = function (options) {
  options = internals._validateOptions(options);
  return internals.streamWithOptions(options);
};

unzipToS3.internals = internals;
module.exports = unzipToS3;
