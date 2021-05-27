$(function() {
  //globals variables
  const socket = io()
  let isCapturingData = false

  let protectionCount = 0
  let protectionValue = 5
  let saveCurrentPage = 0
  let protectionConfidenceTreshold = 0.95
  let previousPrediction

  let IDLE_TIMER = 0

  const WEBCAM = new Webcam(
    $('.webcam-raw')[0],
    $('.webcam-canvas')[0],
    $('.ui-canvas')[0],
    $('.webcam-target')[0]
  )
  const MODEL = new Model(
    WEBCAM, //webcam object
    250, //number of data points to capture
    200, //capture speed
  )

  //dom pointers
  const _loadingUI = $('.loading')
  const _errorUI = $('.error').hide()
  const _ui = $('.ui').hide()

  setInterval(function () {
    IDLE_TIMER++

    if (IDLE_TIMER > 300) {
      window.location.reload()
    }
  }, 1000)

  //initialize the page
  initUI()

  //send to Unity the current page number
  setInterval(function () {
    let currentPrediction = MODEL.prediction

    // protection function
    if(saveCurrentPage == currentPrediction || isCapturingData)
      return

    else{
      if(previousPrediction == currentPrediction && MODEL.confidenceLevel > protectionConfidenceTreshold){
        protectionCount++
      }
      else{
        previousPrediction = currentPrediction
        protectionCount = 0
        return
      }

      if(protectionCount > protectionValue){
        console.log('currentPrediction : ', currentPrediction)
        socket.emit('play media', {media: ''+currentPrediction * 2})
        saveCurrentPage = currentPrediction
        protectionCount = 0

        IDLE_TIMER = 0
      }
      else
        return
    }
  }, 25)

  async function initUI() {
    try {
      await WEBCAM.setup()
      await WEBCAM.getLastTargetPosition()
    } catch (e) {
      console.log(e)
    }

    //try to load exsiting model
    try {
      await MODEL.load()
      MODEL.predict()
    } catch (e) {
      $('.prediction').html('no models found')
      console.log(`no saved model found`)
    }

    //initialize UI
    _loadingUI.hide()
    _ui.show()
  }

  function loadStep(index){
    $('.calibration .step').hide()
    $('.calibration .step').eq(index).show()
  }

  /** dom events **/
  $('.start-calibration').click(async function(){
    console.log(`starting calibration...`)
    MODEL.clearData()
    loadStep(1)
  })

  $('.target-save').click(function(){
    MODEL.saveTargetPosition(WEBCAM)
    $('.total-samples').html(MODEL.dataPointsPerClass)
    loadStep(2)
  })

  $('.target-save-position-no-training').click(function(){
    MODEL.saveTargetPosition(WEBCAM)
  })

  $('.next').click(async function(){
    let currentClassIndex = Number($(this).attr('data-currentClassIndex'))
    isCapturingData = true

    $('.step-03 .next').hide()
    $('.step-03 .samples-info').show()
    console.log(`class index ${currentClassIndex}`)

    //play all media in unity
    socket.emit('play all media', {
      dataPointsPerClass: MODEL.dataPointsPerClass,
      captureSpeed: MODEL.captureSpeed,
      classes: MODEL.classes
    })

    await MODEL.capture(currentClassIndex)
    $('.step-03 .samples-info').hide()
    $('.step-03 .next').show()
    console.log(`capture ${currentClassIndex} done !`)

    if(currentClassIndex == MODEL.classes.length - 1){
      console.log('all data points recorded...')
      isCapturingData = false
      loadStep(3)
      return
    }

    let nextClassIndex = currentClassIndex + 1
    $('.page-number').html(nextClassIndex + 1)
    $(this).attr('data-currentClassIndex', nextClassIndex)
  })

  $('.train').click(async function(){
    $('.step-04 .train').hide()
    $('.step-04 .training-info').show()
    await MODEL.train()
    loadStep(4)
  })

  $('.save').click(async function(){
    await MODEL.save()
    location.reload()
  })

  $('.cancel').click(async function(){
    location.reload()
  })
})
