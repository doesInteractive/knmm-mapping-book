using System.Collections;
using UnityEngine;
using UnityEngine.Video;

public class SceneManager : MonoBehaviour
{
  #region variable

  [Header("Video Player")]
  [Space(8)]
  public VideoPlayer[] videoPlayers;

  [Header("Video Cips")]
  [Space(8)]
  public VideoClip[] videoClips_kr;
  //public VideoClip[] popup_kr;
  //public VideoClip[] videoClips_en;
  //public VideoClip[] popup_en;

  [Header("Video property option")]
  [Space(8)]
  public float crossFadeDuration = 0.7f;
  public float popupBackgroundOpacity;
 
  // private

  private VideoClip[] videoClips = null;
  //private VideoClip[] popupClips = null;
  private VideoPlayer currentActivePlayer;
  private int activePlayerIndex = 0, pendingPlayerIndex = 1, popupPlayerIndex =2, currentClipIndex = 0;
  private bool isFading = false, isPopupOpen = false, isIntroPage = false;
  private string lang = "kr";

  #endregion

  #region standard function

  void Start()
  {
    // set screen size fixed
    Screen.SetResolution(1800, 1220, true, 30);

    // initialize the first page of kr
    videoPlayers[activePlayerIndex].clip = videoClips_kr[0];
    videoPlayers[activePlayerIndex].Play();
    videoPlayers[pendingPlayerIndex].clip = videoClips_kr[1];
    videoPlayers[pendingPlayerIndex].Prepare();

    // add callback function on popup video players
    //videoPlayers[popupPlayerIndex].loopPointReached += EndReached;

    isIntroPage = true;
  }

  void FixedUpdate()
  { 
    // play looping video befroe 3frame before for removing pending time(black blink)
    if(isIntroPage)
    {
      currentActivePlayer = (videoPlayers[0].targetCameraAlpha > 0f) ? videoPlayers[0] : videoPlayers[1];
      if((ulong)currentActivePlayer.frame ==currentActivePlayer.frameCount-3)
        ChangeIntroToLooping(currentActivePlayer);  
    }
  }

  #endregion

  #region page video function

  // change video and check lang
  public void ChangeVideo(int clipIndex)
  {
    isFading = true;
    isIntroPage = true;
    currentClipIndex = clipIndex;

    // check which videplayer active and change with pending
    activePlayerIndex = (videoPlayers[0].targetCameraAlpha > 0f) ? 0 : 1;
    pendingPlayerIndex = (videoPlayers[0].targetCameraAlpha > 0f) ? 1 : 0;

    // close the popup if it open
    if (isPopupOpen)
    {
      videoPlayers[popupPlayerIndex].Stop();
      videoPlayers[popupPlayerIndex].targetCameraAlpha = 0;
      isPopupOpen = false;
    }

    // check language and change videocip array
    //if (lang == "kr")
    videoClips = videoClips_kr;
    //else if (lang == "en")
      //videoClips = videoClips_en;

    videoPlayers[pendingPlayerIndex].clip = videoClips[currentClipIndex];
    videoPlayers[pendingPlayerIndex].isLooping = false;
    videoPlayers[pendingPlayerIndex].Play();

    Debug.Log("here" + pendingPlayerIndex + videoClips[currentClipIndex]);

    StartCoroutine("CrossFadeVideo", crossFadeDuration); 

  }

  IEnumerator CrossFadeVideo(float duration)
  {
    for (float t = 0f; t < duration; t += Time.deltaTime)
    {
      float normalizedTime = t / duration;
      videoPlayers[activePlayerIndex].targetCameraAlpha = Mathf.Lerp(1f, 0f, normalizedTime);
      videoPlayers[pendingPlayerIndex].targetCameraAlpha = Mathf.Lerp(0f, 1f, normalizedTime);
      yield return null;
    }

    videoPlayers[activePlayerIndex].targetCameraAlpha = 0f;
    videoPlayers[pendingPlayerIndex].targetCameraAlpha = 1f;

    if (isPopupOpen)
    {
      // dim out the active player
      videoPlayers[activePlayerIndex].targetCameraAlpha = popupBackgroundOpacity;
      videoPlayers[pendingPlayerIndex].targetCameraAlpha = 0f;
    }

    // prepare the next looping video
    // play next looping vido with zero opacity
    int nextVideoIndex = currentClipIndex + 1;
    videoPlayers[activePlayerIndex].clip = videoClips[nextVideoIndex];
    videoPlayers[activePlayerIndex].Prepare();
    isFading = false;
  }

  void ChangeIntroToLooping(VideoPlayer vp){

    isIntroPage = false;

    if (vp.gameObject.tag == "popup")
    {
      // check which videplayer active and change with pending
      activePlayerIndex = (videoPlayers[0].targetCameraAlpha > 0f) ? 0 : 1;
      pendingPlayerIndex = (videoPlayers[0].targetCameraAlpha > 0f) ? 1 : 0;

      videoPlayers[activePlayerIndex].targetCameraAlpha = 0;
      videoPlayers[pendingPlayerIndex].targetCameraAlpha = popupBackgroundOpacity;
      
      isPopupOpen = false;
    }
    else
    {
      if (!isFading)
      {
        // check pending player
        activePlayerIndex = (videoPlayers[0].targetCameraAlpha > 0f) ? 0 : 1;
        pendingPlayerIndex = (videoPlayers[0].targetCameraAlpha > 0f) ? 1 : 0;

        if (!vp.isLooping)
        {
          videoPlayers[pendingPlayerIndex].isLooping = true;
          StartCoroutine("StartLoopingVideo");
        }
      }
    }
  }

  IEnumerator StartLoopingVideo()
  {
    videoPlayers[pendingPlayerIndex].Play();
    yield return new WaitForSeconds(0.1f);
    videoPlayers[pendingPlayerIndex].targetCameraAlpha = (isPopupOpen) ? popupBackgroundOpacity : 1f;
    videoPlayers[activePlayerIndex].targetCameraAlpha = 0;  
  }

  // public void ChangeLanaguage()
  // {
  //   lang = lang == "kr" ? "en" : "kr";
  //   ChangeVideo(currentClipIndex);
  // }

  #endregion

  //#region pop up function

  // public void PopUpPlay(string socketData)
  // {
  //   if (isPopupOpen || isFading)
  //     return;

  //   if (lang == "kr")
  //     popupClips = popup_kr;
  //   else if (lang == "en")
  //     popupClips = popup_en;

  //   if(socketData == "popup0"){
  //     if(currentClipIndex != 0) return;
  //   }
  //   else if(socketData == "popup1"){
  //     if(currentClipIndex == 0) return;
  //   }

  //   videoPlayers[popupPlayerIndex].clip = popupClips[currentClipIndex / 2];
  //   videoPlayers[popupPlayerIndex].Stop();
  //   videoPlayers[popupPlayerIndex].Play();
  //   videoPlayers[popupPlayerIndex].targetCameraAlpha = 1f;

  //   // check pending player
  //   activePlayerIndex = (videoPlayers[0].targetCameraAlpha > 0f) ? 0 : 1;
  //   pendingPlayerIndex = (videoPlayers[0].targetCameraAlpha > 0f) ? 1 : 0;

  //   // dim out the active player
  //   videoPlayers[activePlayerIndex].targetCameraAlpha = popupBackgroundOpacity;

  //   isPopupOpen = true;
  // }

  // popup video finish
//   void EndReached(VideoPlayer vp){
//     // check pending player
//     activePlayerIndex = (videoPlayers[0].targetCameraAlpha > 0f) ? 0 : 1;
//     pendingPlayerIndex = (videoPlayers[0].targetCameraAlpha > 0f) ? 1 : 0;

//     // dim out the active player
//     videoPlayers[activePlayerIndex].targetCameraAlpha = 1;

//     // popup disappear
//     videoPlayers[popupPlayerIndex].targetCameraAlpha = 0;

//      isPopupOpen = false;
//     }

//   #endregion

}

