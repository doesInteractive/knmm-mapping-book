using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using SocketIO;

public class SocketManager : MonoBehaviour
{

  [Header("Scripts")]
  [SerializeField] SocketIOComponent socket;
  [SerializeField] SceneManager sceneManager;

  void Start()
  {
    socket.On("play media", PlayMediaEvent);
    socket.On("play all media", PlayAllMediaEvent);
  }

  public void PlayMediaEvent(SocketIOEvent e)
  {
    if (e.data == null) { return; }

    Debug.Log("Received data from server: " + e.data.GetField("media").str);

    string socketData = e.data.GetField("media").str;

    // lanaguage change
    // if (socketData == "changelang")
    //   sceneManager.ChangeLanaguage();

    // page change active
    if (socketData == "0" || socketData == "2" || socketData == "4" || socketData == "6" || socketData == "8")
    {
      sceneManager.ChangeVideo(int.Parse(socketData));
    }

    // popup play
    // else if (socketData.Contains("popup"))
    //   sceneManager.PopUpPlay(socketData);
  }

  public void PlayAllMediaEvent(SocketIOEvent e)
  {
    if (e.data == null) { return; }
    string socketData = e.data.GetField("media").str;
    sceneManager.ChangeVideo(int.Parse(socketData));
  }
}


