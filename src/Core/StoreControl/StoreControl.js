
//初始化常量表
// eslint-disable-next-line no-lone-blocks
import {nextSentenceProcessor} from "../WG_core";
import { prefetcher } from '../util/PrefetchWrapper';
import {WG_ViewControl} from "../ViewController/ViewControl";
import pako from 'pako';

{
    var setAutoWaitTime = 1500;
    var autoWaitTime = 1500;
    var textShowWaitTime = 35;
}

//初始化游戏信息表
// eslint-disable-next-line no-lone-blocks
{
    var GameInfo =
        {
            Game_name:'WebGAL Demo',
            Game_key:'WG_default',
            Title_img:'Title.png',
            Title_bgm:'夏影.mp3',
            Loading_img:'none'
        }

    var SettingsMap =
        {
            font_size: {
                'small': '150%',
                'medium': '200%',
                'large': '250%',
            },
            play_speed:{
                'low': 55,
                'medium': 35,
                'fast': 20
            }
        }
}

//初始化运行时变量表
// eslint-disable-next-line no-lone-blocks
{
    var currentScene ='';
    var auto = 0;
    var fast = 0;
    var onTextPreview = 0;
    var showingText = false;
    var hideTextStatus = false;
    var temp_bgm_TitleToGameplay = '';
}

// 初始化状态表
var currentInfo ={
    SceneName:'',//场景文件名
    SentenceID:0,//语句ID
    bg_Name:'',//背景文件名
    fig_Name:'',//立绘_中 文件名
    fig_Name_left:'',//立绘_左 文件名
    fig_Name_right:'',//立绘_右 文件名
    showText:'',//文字
    showName:'',//人物名
    command:'',//语句指令
    choose:'',//选项列表
    vocal:'',//语音 文件名
    bgm:'',//背景音乐 文件名
    miniAvatar:'',//小头像
    saveTime:'',
    GameVar:{
    }
}

// 初始化存档系统
var Saves=[];
var SaveBacklog=[];

// 初始化backlog存储表
var CurrentBacklog=[];

//初始化存读档页面记录
var currentSavePage = 0;
var currentLoadPage = 0;

// 初始化设置表
var Settings = {
    font_size: 'medium',
    play_speed:'medium'
};

var runtime = {
    setAutoWaitTime,autoWaitTime,textShowWaitTime,
    GameInfo,currentScene,auto,fast,onTextPreview,showingText,hideTextStatus,
    currentInfo,Saves,SaveBacklog,CurrentBacklog,currentSavePage,currentLoadPage,Settings,temp_bgm_TitleToGameplay
}

function getRuntime(){
    return runtime;
}

function loadCookie(){
    if(localStorage.getItem(GameInfo['Game_key'])){
        // let pre_process = document.cookie;
        // let fst = pre_process.split(';')[0];
        // let scd = document.cookie.slice(fst.length+1);
        let unzip = unzipStr(localStorage.getItem(GameInfo['Game_key']));
        let data = JSON.parse(unzip);
        Saves = data.SavedGame;
        SaveBacklog = data.SavedBacklog;
        currentSavePage = data.SP;
        currentLoadPage  = data.LP;
        Settings = data.cSettings;
    }
}

function writeCookie(){
    // var expire = new Date((new Date()).getTime() + 20000 * 24 * 60 * 60000);//有效期20000天
    // expire = ";expires=" + expire.toGMTString();
    let toCookie = {
        SavedGame:Saves,
        SavedBacklog:SaveBacklog,
        SP:currentSavePage,
        LP:currentLoadPage,
        cSettings:Settings
    }
    // console.log(JSON.stringify(toCookie));
    let gzip = zipStr(JSON.stringify(toCookie),{to:'string'});
    localStorage.setItem(GameInfo['Game_key'],gzip);
    // document.cookie = JSON.stringify(toCookie);
}

function clearCookie(){
    let toCookie = {
        SavedGame:[],
        SavedBacklog:[],
        SP:0,
        LP:0,
        cSettings:{
            font_size: 'medium',
            play_speed:'medium'
        }
    }
    let gzip = zipStr(JSON.stringify(toCookie),{to:'string'});
    localStorage.setItem(GameInfo['Game_key'],gzip);
}

function loadSettings(){
    let fontSizeKey = Settings.font_size;
    let fontSize = SettingsMap.font_size[fontSizeKey];

    let playSpeedKey = Settings.play_speed;
    let playSpeed = SettingsMap.play_speed[playSpeedKey];

    document.getElementById('SceneText').style.fontSize = fontSize;
    textShowWaitTime = playSpeed;
}

function SyncCurrentStatus(statusKey,newStatus) {
    if(statusKey ==='all'){
        for (let StatusProp in newStatus){
            if(currentInfo.hasOwnProperty(StatusProp)){
                currentInfo[StatusProp] = newStatus[StatusProp];
            }
        }
    }
    else
        currentInfo[statusKey] = newStatus;
}

function getStatus(statusKey){
    if(statusKey ==='all')
        return currentInfo;
    else
        return currentInfo[statusKey];
}

// 获取场景脚本
function getScene(url) {
    currentScene ='';

    let getScReq = null;
    getScReq = new XMLHttpRequest();
    console.log('now read scene')
    if (getScReq != null) {
        getScReq.open("get",url , true);
        getScReq.send();
        getScReq.onreadystatechange = doResult; //设置回调函数
    }
    function doResult() {
        if (getScReq.readyState === 4) { //4表示执行完成
            if (getScReq.status === 200) { //200表示执行成功
                currentScene = getScReq.responseText;
                currentScene = currentScene.split('\n');
                for (let i = 0;i<currentScene.length;i++){
                    let tempSentence = currentScene[i].split(";")[0];
                    let commandLength = tempSentence.split(":")[0].length;
                    let command = currentScene[i].split(":")[0];
                    command = command.split(';')[0];
                    let content = tempSentence.slice(commandLength+1);
                    currentScene[i] = currentScene[i].split(":");
                    currentScene[i][0] = command;
                    currentScene[i][1] = content;
                }
                console.log('Read scene complete.');
                console.log(currentScene);
                getRuntime().currentScene = currentScene
                SyncCurrentStatus('SentenceID',0);
                nextSentenceProcessor();
                prefetcher.onSceneChange(url);
            }
        }
    }

}

function getGameInfo() {
    let getInfoCon = new XMLHttpRequest();
    getInfoCon.onreadystatechange = function (){
        if(getInfoCon.status === 200){
            let textList = getInfoCon.responseText;
            textList = textList.split('\n');
            for (let i = 0; i < textList.length; i++) {
                let tempStr = textList[i].split(";")[0];
                let temp = tempStr.split(':');
                // eslint-disable-next-line default-case
                switch (temp[0]) {
                    case 'Game_name':
                        GameInfo['Game_name'] = temp[1];
                        break;
                    case 'Game_key':
                        GameInfo['Game_key'] = temp[1];
                        break;
                    case 'Title_img':
                        GameInfo['Title_img'] = temp[1];
                        break;
                    case 'Title_bgm':
                        GameInfo['Title_bgm'] = temp[1];
                        break;
                    case 'Loading_img':
                        GameInfo['Loading_img'] = temp[1];
                }
            }
            document.getElementById('Title').style.backgroundImage = 'url("./game/background/'+GameInfo["Title_img"]+'")';
            if(GameInfo["Loading_img"]!=='none')
                document.getElementById('WG_startPage').style.backgroundImage = 'url("./game/background/'+GameInfo["Loading_img"]+'")';
            SyncCurrentStatus('bgm',GameInfo['Title_bgm']);
            // WG_ViewControl.loadBGM();
            document.title = GameInfo['Game_name'];
        }

    }
    getInfoCon.open('GET','game/config.txt');
    getInfoCon.send();
}
// 解压
function unzipStr(jData) {
    const binData = JSON.parse(jData);
    const data = pako.inflate(binData);
    const strData = String.fromCharCode.apply(null, new Uint16Array(data));
    return decodeURIComponent(strData);
}

// 压缩
function zipStr(str) {
    const binaryString = pako.gzip(encodeURIComponent(str), {to: 'string'});
    return(JSON.stringify(binaryString));
}

export {
    setAutoWaitTime,autoWaitTime,textShowWaitTime,
    GameInfo,currentScene,auto,fast,onTextPreview,showingText,hideTextStatus,
    currentInfo,Saves,SaveBacklog,CurrentBacklog,currentSavePage,currentLoadPage,Settings,SettingsMap,
    loadCookie,writeCookie,clearCookie,loadSettings,getStatus,getScene,getGameInfo,SyncCurrentStatus,getRuntime
}