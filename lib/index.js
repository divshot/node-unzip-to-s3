var unzip = require('unzip');
var knox = require('knox');
var through = require('through');
var path = require('path');
var MultiPartUpload = require('knox-mpu');
var unzipToS3 = {};

unzipToS3.createClient = function (options) {
  return function (zipStream) {
    var stream = through();
    var client = knox.createClient({
      key: options.key,
      secret: options.secret,
      bucket: options.bucket
    });
    
    zipStream.pipe(unzip.Parse()).on('entry', function (entry) {
      if (entry.type === 'File') {
        var fullPath = '/' + path.join('nodezip', entry.path);
        
        var upload = new MultiPartUpload({
            client: client,
            objectName: fullPath,
            stream: entry
          }, function(err, body) {
            if (err) {
              return stream.emit('error', err);
            }
            
            entry.location = body.Location;
            entry.bucket = body.Bucket;
            entry.key = body.Key;
            entry.etag = body.ETag;
            entry.size = body.size;
            
            stream.emit('data', entry);
        });
      }
      else{
        entry.autodrain();
      }
    });
    
    return stream;
  };
};

module.exports = unzipToS3;