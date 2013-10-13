# unzip-to-s3

Unzip files directly Amazon S3 using streams.

## Install

```
npm install unzip-to-s3 --save
```

## Usage

```javascript
var fs = require('fs');
var unzipToS3 = require('unzip-to-s3');

// Create the S3 client
var bucketUpload = unzipToS3.createClient({
  key: 'some_key',        // required
  secret: 'some_secret',  // required
  bucket: 'some_bucket',  // required
  directory: 'nodezip',   // optional
  token: ''               // optional
});

// Create the zip read stream
var zipStream = fs.createReadStream('path/to/some/file.zip');

// Unzip and upload
bucketUpload(zipStream).on('data', function (file) {
  // "file" is the file stream and object that was inflated
  // from the zip file
});
```

**unzip-to-s3** uses [Knox](https://github.com/LearnBoost/knox) underneath, so refer to ther [Client Creation Options](https://github.com/LearnBoost/knox#client-creation-options) for all client optionts.

## Run tests

```
npm install
npm test
```
