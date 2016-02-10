var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var sinon = require('sinon');
var knox = require('knox');
var through = require('through');
var archiver = require('archiver');
var uploadToS3 = require('../lib/index');
var internals = uploadToS3.internals;
var fileData = {
  Location: 'location',
  Bucket: 'bucket',
  Key: 'key',
  ETag: 'etag',
  size: 'size'
};
var clientOptions = {
  key: 'key',
  secret: 'secret',
  bucket: 'bucket'
};

describe('Upload to S3', function () {
  var tmpDir = './.tmp';
  var fileName = 'test.txt';
  var filePath = path.join(tmpDir, fileName);
  var zipFilePath = path.join(tmpDir, 'test.zip');
  var fileContent = 'test';

  beforeEach(function (done) {
    fs.mkdirSync(tmpDir)
    fs.writeFileSync(filePath, fileContent);

    var output = fs.createWriteStream(zipFilePath);
    var archive = archiver('zip');

    archive.pipe(output);
    archive.append(fs.createReadStream(filePath), {name: fileName});
    archive.finalize(function (err, bytes) {
      done();
    });
  });

  afterEach(function (done) {
    fs.unlinkSync(filePath);
    fs.unlinkSync(zipFilePath);
    fs.rmdirSync(tmpDir);
    done();
  });

  describe('options validation', function() {
    var options;

    beforeEach(function () {
      options = {
        key: 'key',
        secret: 'secret',
        bucket: 'bucket'
      };
    });

    it('validates the key option', function () {
      delete options.key;
      var err = tryOptions(options);
      expect(err instanceof Error).to.be.ok;
    });

    it('validates the secret option', function () {
      delete options.secret;
      var err = tryOptions(options);
      expect(err instanceof Error).to.be.ok;
    });

    it('validates the bucket option', function () {
      delete options.bucket;
      var err = tryOptions(options);

      expect(err instanceof Error).to.be.ok;
    });

    it('sets the directory path option default if none is provided', function () {
      var _options = internals._validateOptions(options);
      expect(_options.path).to.equal('/');
    });
  });

  it('builds the file stream object', function () {
    var file = {};
    file = internals._buildFileObject(file, fileData)
    expect(file.location).to.equal('location');
    expect(file.bucket).to.equal('bucket');
    expect(file.key).to.equal('key');
    expect(file.etag).to.equal('etag');
    expect(file.size).to.equal('size');
  });

  it('creats a knox client', function () {
    var client = internals._createClient({ key: 'key', secret: 'secret', bucket: 'bucket' });
    var knoxClient = knox.createClient({ key: 'key', secret: 'secret', bucket: 'bucket' });
    expect(client.toString()).to.eql(knoxClient.toString());
  });

  describe('#internals.unzipFiles()', function() {

    // This test is required because the unzipping module
    // emits a "finish" event, instead of "end". Want to be sure we address that.
    it('emits and "end" event', function (done) {
      internals.unzipFiles(fs.createReadStream(zipFilePath)).on('end', function () {
        done();
      });
    });

    it('only unzips types of "File" from the zip file', function (done) {
      internals.unzipFiles(fs.createReadStream(zipFilePath)).on('data', function (file) {
        expect(file.type).to.equal('File');
      }).on('end', function () {
        done();
      });
    });

  });

  it.only('uploads files', function (done) {
    var proxyquire = require('proxyquire');
    var knoxMpuSpy = sinon.spy();
    var uploadToS3 = proxyquire('../lib/index', { 'knox-mpu': knoxMpuSpy });
    var internals = uploadToS3.internals;
    var returnStream = through();
    var dirPath = 'dirPath';
    var client = internals._createClient(clientOptions);
    var zipStream = internals.unzipFiles(fs.createReadStream(zipFilePath));
    var uploadStream = internals.uploadFiles(client, returnStream, dirPath);

    zipStream.pipe(uploadStream).on('end', function () {
      var args = knoxMpuSpy.args[0];

      expect(knoxMpuSpy.called).to.be.ok;
      expect(args[0].client.toString()).to.equal(client.toString());
      expect(args[1]).to.be.a('function');

      done();
    });
  });

  it('streams with options', function () {
    var options = clientOptions;
    var streamer = internals.streamWithOptions(options);

    expect(streamer).to.be.a('function');
  });

});

function tryOptions (options) {
  var err;

  try{
    internals._validateOptions(options);
  }
  catch (e) {
    err = e;
  }
  finally {
    return err;
  }
}
