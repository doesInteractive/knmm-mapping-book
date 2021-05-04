const express = require('express')
const router = express.Router()
const fs = require('fs')
const formidable = require('formidable')

router.get('/', function(req, res, next) {
  res.render('manager')
})

router.post('/save_sample_data', function(req, res, next) {
  let dataDir = './public/data'
  let filename = 'data.json'
  let sampleData = JSON.stringify(req.body.dataPoint)

  if (!fs.existsSync(dataDir))
    fs.mkdirSync(dataDir)

  fs.access(dataDir+'/'+filename, fs.F_OK, (err) => {
    if (!err)
      sampleData = ','+sampleData

    fs.appendFile(dataDir+'/'+filename, sampleData, function (err) {
      if (err) console.log(err)
      res.json({
        status: "success"
      })
    })
  })
})

router.post('/clear_dataset', function(req, res, next) {
  let dataDir = './public/data'
  let filename = 'data.json'

  fs.unlink(dataDir+'/'+filename, function(err){
    if(err) console.log(err)
    res.json({
      status: "success"
    })
  })
})

router.post('/save_webcam_target_position', function(req, res, next) {
  let dataDir = './public/data'
  let filename = 'settings.json'

  if (!fs.existsSync(dataDir))
    fs.mkdirSync(dataDir)

  fs.writeFile(dataDir+'/'+filename, JSON.stringify(req.body), function (err) {
    if (err) console.log(err)
    res.json({
      status: "success"
    })
  })
})

router.post('/save_model_to_disk', function(req, res, next) {
  let form = new formidable.IncomingForm()
  form.uploadDir = './public/models'
  form.multiples = true

  form.on('file', function(field, file) {
    fs.rename(file.path, form.uploadDir + "/" + file.name, function(err){
      console.log(err)
    })
  })

  form.parse(req, function(err, fields, files) {
    console.log(files)
    res.json({
      status: "succes"
    })
  })
})

router.get('/mediaplayer', function(req, res, next) {
  res.render('mediaplayer')
})

module.exports = router
