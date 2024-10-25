/* eslint-disable */
import { createApp } from 'vue'
import App from './App.vue'
//import ElementPlus from 'element-plus'
//import 'element-plus/dist/index.css'

// 评语页面url关键字，用于判断是否在评语页面
const _url = "timetable";
// 配置信息
let _template = {
  contentShow: false,
};

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  var result;
  switch (message.type) {
    case "getClass":
      {
        result = await getClass();
        break;
      }
    case "submitComments":
      {
        result = await submitComments(message.data);
        break;
      }
    case "refreshContent":
      {
        refreshContent();
        break;
      }
    case "inject":
      {
        inject();
        break;
      }
    default:
      {
        result = `不支持该方法名[${message.type}]`;
        break;
      }
  }
  sendResponse(result);
  return true;
});

window.onload = async function () {
  // let timeTable = document.getElementsByClassName("el-menu-item")[2];
  // if (timeTable) {
  //   timeTable.addEventListener("click", function () { console.log("click-timeTable"); binding() });
  // }
  if (window.location.href.indexOf(_url) > 0) {
    inject();
  }
}

// 注入元素
async function inject() {
  // 读取配置信息
  var { template } = await chrome.runtime.sendMessage({ method: "getLocalStorage", data: "template" });
  console.log("config", template);
  if (!template || !template.contentShow) {
    return;
  }
  _template = template;

  // 获取课表并注入按钮
  var classData = await getClass();
  if (classData && classData.resultCode === 0 && classData.resultData) {
    var list = classData.resultData.bookedList;
    setTimeout(() => {
      injectTotal(list);
      injectSingle(list);
    }, 500);
  }
}

// 注入总数按钮
function injectTotal(data) {
  const div = document.createElement('div');
  div.setAttribute('id', 'total');
  div.setAttribute('style', 'margin-left: 220px; align-items: center; display: inline-flex;');

  const span = document.createElement('span');
  span.setAttribute('style', 'color: #0087ff');
  span.innerHTML = data ? `共<span>${data.length}</span>节课可打评语` : "<span>获取课程失败</span>";
  div.appendChild(span);

  if (data && data.length > 0) {
    const button = document.createElement('button');
    button.setAttribute('style', 'background-color: #0087ff; border: none; text-align: center; font-size: 16px; color: white; padding: 5px 10px; display: inline-block; text-decoration: none; border-radius: 5px; margin-left: 10px;');
    button.innerHTML = '一键提交所有评语';
    button.addEventListener('click', function () { submitAll(data); });
    div.appendChild(button);
  }

  var totalDiv = document.getElementsByClassName("total-num")[0];
  totalDiv.appendChild(div);
  //const app = createApp(App, { total: 12 });
  ////app.use(ElementPlus)
  //app.mount('#total');
}

// 注入单个按钮
function injectSingle(data) {
  if (!data || data.length === 0) {
    return;
  }
  var ids = data.map(el => { return el.datebookId.toString() });
  var list = document.getElementsByClassName("list-content");
  for (var i = 0; i < list.length; i++) {
    var id = list[i].children[0].innerText.match(/^\d+/g)[0];
    if (ids.includes(id)) {
      var div = document.createElement('div');
      div.setAttribute('id', id);
      div.innerHTML = `<button style="background-color: #0087ff; border: none; text-align: center; font-size: 16px; color: white; padding: 5px 10px; display: inline-block; text-decoration: none; border-radius: 5px">提交评语</button>`;
      div.addEventListener('click', function () { submitSingle(this.id); })

      var feedbackClumn = list[i].getElementsByClassName("feedback")[0];
      feedbackClumn.appendChild(div);
    }
  }
}

async function submitSingle(id) {
  let result = doComment(id);
  if (!result || result.resultCode !== 0) {
    alert(`提交评语失败：【${result?.resultMessage}】`);
  } else {
    alert(`提交评语成功`);
  }
  refreshContent();
}

async function submitAll(data) {
  let ids = data.map(el => { return el.datebookId });
  let result = submitComments(ids);
  if (result && result.resultCode === 0) {
    alert("一键提交评语成功");
  } else {
    alert(`一键提交评语失败: 【${result?.resultMessage}】`);
  }
  refreshContent();
}

// 提交所有评语
function submitComments(idList) {
  if (idList && idList.length > 0) {
    let errorIds = [];
    let errMsg = "";
    idList.forEach(id => {
      let result = doComment(id);
      if (!result || result.resultCode !== 0) {
        errorIds.push(id);
        errMsg = result?.resultMessage;
      }
    });
    if (errorIds.length > 0) {
      return { resultCode: 1, resultMessage: `共${errorIds.length}节课提交评语失败,【${errMsg}】` };
    } else {
      return { resultCode: 0, resultMessage: "提交评语成功" };
    }
  } else {
    return { resultCode: 1, resultMessage: "没有可提交的评语" };
  }
}

// 获取列表
function getClass() {
  var url = "https://www.talk915.com/datebook/teacherClass/bookedClass";
  var data = `{
                  "currPage": 1,
                  "pageSize": 50,
                  "beginDate": "${getDay(0)}",
                  "endDate": "${getDay(1)}",
                  "userName": "",
                  "classType": -1,
                  "classStatus": 5,
                  "num": 1,
                  "code": null
              }`;
  var resp = post(url, data);
  if (resp) {
    return JSON.parse(resp);
  } else {
    return { resultCode: 1, resultMessage: "获取课程列表失败。" };
  }
}

// 提交单个评语
function doComment(classId) {
  if (!classId) {
    return { resultCode: 1, resultMessage: "classId不能为空" };
  }
  if (!_template || !_template.pronunciation || !_template.vocabulary || !_template.grammar || !_template.suggestion) {
    return { resultCode: 1, resultMessage: "评语模板不能为空" };
  }
  var url = "https://www.talk915.com/datebook/teacherClass/commentsForStu";
  var data = `{
                  "id": "${classId}",
                  "stuClassStatus": 0,
                  "giveFlower": "0",
                  "pronunciation": "${_template.pronunciation}",
                  "vocabulary": "${_template.vocabulary}",
                  "grammar": "${_template.grammar}",
                  "highLights": "${_template.suggestion}",
                  "remark": ""
              }`;

  var resp = post(url, data);
  if (resp) {
    return JSON.parse(resp);
  } else {
    return { resultCode: 1, resultMessage: "评语提交失败" };
  }
}

// 刷新当前页面
function refreshContent() {
  if (window.location.href.indexOf(_url) > 0) {
    location.reload();
  }
}

// POST同步请求
function post(url, data) {
  var token = getCookie("token");

  var resp = null;
  var xml = new XMLHttpRequest();
  xml.open("POST", url, false);
  xml.setRequestHeader("Content-type", "application/json");
  xml.setRequestHeader("token", token);
  xml.send(data);

  if (xml.status == 200) {
    resp = xml.response;
  } else {
    resp = "";
    console.log(`post失败: ${xml.status}  ${xml.statusText}`);
  }

  return resp;
}

// 获取日期 yyyy-mm-dd
function getDay(addDays) {
  var today = new Date();

  if (addDays != 0) {
    var nowTime = today.getTime();
    var ms = 24 * 3600 * 1000 * addDays;
    today.setTime(parseInt(nowTime + ms));
  }

  var oYear = today.getFullYear();
  var oMonth = (today.getMonth() + 1).toString();
  if (oMonth.length <= 1) {
    oMonth = "0" + oMonth;
  }
  var oDay = today.getDate().toString();
  if (oDay.length <= 1) {
    oDay = "0" + oDay;
  }

  return oYear + "-" + oMonth + "-" + oDay;
}

// 获取cookies
function getCookie(name) {
  var cookies = document.cookie;
  var list = cookies.split("; ");     // 解析出名/值对列表

  for (var i = 0; i < list.length; i++) {
    var arr = list[i].split("=");   // 解析出名和值
    if (arr[0] == name) {
      return decodeURIComponent(arr[1]);   // 对cookie值解码
    }
  }

  return "";
}

// 获取模拟课程列表
async function getMockData() {
  let mockData = {
    "resultCode": 0,
    "resultMessage": "操作成功",
    "resultData": {
      "bookedList": [
        {
          "datebookId": 35032750,
          "experienceClass": 0,
          "timeScheduleId": 25322897,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-17 15:20-16:10",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 18256,
          "lesson": "12 : Unit3 Lesson4 Families Work Together Explore",
          "assessClassStatus": 0,
          "dateTime": "2024-10-17 15:30-15:55",
          "assessClass": 0,
          "stuId": 1247040,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": null,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": null,
          "skype": null,
          "phone": "13918604820",
          "userName": "Karin",
          "leval": "3",
          "age": 9,
          "sex": 0,
          "lessonPlan": "G2 High-intermediate（新版）  Unit3 Lesson4 Families Work Together Explore",
          "localTime": "2024-10-17 15:30-15:55",
          "classFileList": [
            {
              "lrId": 21294,
              "fileName": "High-Inter-2020-U03-L04-V3.pdf",
              "fileType": "pdf",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 0,
          "enterTime": "2024-10-17 15:20-16:10",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-03 00:10:02",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35032843,
          "experienceClass": 0,
          "timeScheduleId": 26122481,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-17 16:20-17:10",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 19142,
          "lesson": "4 : Unit3 sm sn sp sw st",
          "assessClassStatus": 0,
          "dateTime": "2024-10-17 16:30-16:55",
          "assessClass": 0,
          "stuId": 1185734,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": null,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": null,
          "skype": null,
          "phone": "13811626562",
          "userName": "yoyo",
          "leval": null,
          "age": 6,
          "sex": 0,
          "lessonPlan": "牛津自然拼读世界第4册  Unit3 sm sn sp sw st",
          "localTime": "2024-10-17 16:30-16:55",
          "classFileList": [
            {
              "lrId": 22796,
              "fileName": "OxfordPhonicsWorld-202103-04-unit03.pdf",
              "fileType": "pdf",
              "fileUrl": null
            },
            {
              "lrId": 22797,
              "fileName": "OPW-202103-04-unit03-track35.mp3",
              "fileType": "mp3",
              "fileUrl": null
            },
            {
              "lrId": 22798,
              "fileName": "OPW-202103-04-unit03-track36.mp3",
              "fileType": "mp3",
              "fileUrl": null
            },
            {
              "lrId": 22799,
              "fileName": "OPW-202103-04-unit03-track37.mp3",
              "fileType": "mp3",
              "fileUrl": null
            },
            {
              "lrId": 22800,
              "fileName": "OPW-202103-04-unit03-track38.mp3",
              "fileType": "mp3",
              "fileUrl": null
            },
            {
              "lrId": 22801,
              "fileName": "OPW-202103-04-unit03-track39.mp3",
              "fileType": "mp3",
              "fileUrl": null
            },
            {
              "lrId": 22802,
              "fileName": "OPW-202103-04-unit03-track40.mp3",
              "fileType": "mp3",
              "fileUrl": null
            },
            {
              "lrId": 22803,
              "fileName": "OPW-202103-04-unit03-track41.mp3",
              "fileType": "mp3",
              "fileUrl": null
            },
            {
              "lrId": 22804,
              "fileName": "OPW-202103-04-unit03-track42.mp3",
              "fileType": "mp3",
              "fileUrl": null
            },
            {
              "lrId": 22805,
              "fileName": "OPW-202103-04-unit03-track43.mp3",
              "fileType": "mp3",
              "fileUrl": null
            },
            {
              "lrId": 22806,
              "fileName": "OPW-202103-04-unit03-track44.mp3",
              "fileType": "mp3",
              "fileUrl": null
            },
            {
              "lrId": 22807,
              "fileName": "OPW-202103-04-unit03-track45.mp3",
              "fileType": "mp3",
              "fileUrl": null
            },
            {
              "lrId": 22808,
              "fileName": "OPW-202103-04-unit03-track46.mp3",
              "fileType": "mp3",
              "fileUrl": null
            },
            {
              "lrId": 22809,
              "fileName": "OPW-202103-04-unit03-track47.mp3",
              "fileType": "mp3",
              "fileUrl": null
            },
            {
              "lrId": 22810,
              "fileName": "OPW-202103-04-unit03-track48.mp3",
              "fileType": "mp3",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 0,
          "enterTime": "2024-10-17 16:20-17:10",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-10 10:44:28",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35032914,
          "experienceClass": 0,
          "timeScheduleId": 26033545,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-17 16:50-17:40",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 18170,
          "lesson": "6 : Unit2 Lesson2 Family Fun",
          "assessClassStatus": 0,
          "dateTime": "2024-10-17 17:00-17:25",
          "assessClass": 0,
          "stuId": 1386666,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": null,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": null,
          "skype": null,
          "phone": "13685178610",
          "userName": "Lena",
          "leval": "2",
          "age": 6,
          "sex": 0,
          "lessonPlan": "G1 Pre-intermediate（新版）  Unit2 Lesson2 Family Fun",
          "localTime": "2024-10-17 17:00-17:25",
          "classFileList": [
            {
              "lrId": 21208,
              "fileName": "Pre-intermediate-2020-U02-L02-V4.pdf",
              "fileType": "pdf",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 0,
          "enterTime": "2024-10-17 16:50-17:40",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-14 06:56:51",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35033262,
          "experienceClass": 0,
          "timeScheduleId": 26132553,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-17 17:50-18:40",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 18818,
          "lesson": "58 : Unit15 Lesson2 Adjectives That Compare",
          "assessClassStatus": 0,
          "dateTime": "2024-10-17 18:00-18:25",
          "assessClass": 0,
          "stuId": 1091061,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": null,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": "644598736",
          "skype": null,
          "phone": "17351982161",
          "userName": "student",
          "leval": null,
          "age": 4,
          "sex": 1,
          "lessonPlan": "GK Basic Plus（新版）  Unit15 Lesson2 Adjectives That Compare",
          "localTime": "2024-10-17 18:00-18:25",
          "classFileList": [
            {
              "lrId": 22052,
              "fileName": "Basic-Plus-U15-L02-2021-V1.pdf",
              "fileType": "pdf",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 0,
          "enterTime": "2024-10-17 17:50-18:40",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-03 00:10:02",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35101914,
          "experienceClass": 0,
          "timeScheduleId": null,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-17 18:20-19:10",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 21486,
          "lesson": "26 : U9L2 Working week P87-P89",
          "assessClassStatus": 0,
          "dateTime": "2024-10-17 18:30-18:55",
          "assessClass": 0,
          "stuId": 731899,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": 0,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": "455269515",
          "skype": "0",
          "phone": "13911055728",
          "userName": "Arthur",
          "leval": null,
          "age": 6,
          "sex": 1,
          "lessonPlan": "Level 2 (B1)  U9L2 Working week P87-P89",
          "localTime": "2024-10-17 18:30-18:55",
          "classFileList": [
            {
              "lrId": 26182,
              "fileName": "579-U09-L02-V1.pdf",
              "fileType": "pdf",
              "fileUrl": null
            },
            {
              "lrId": 28352,
              "fileName": "579-U09-L02-01.mp3",
              "fileType": "mp3",
              "fileUrl": null
            },
            {
              "lrId": 28353,
              "fileName": "579-U09-L02-02.mp3",
              "fileType": "mp3",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 0,
          "enterTime": "2024-10-17 18:20-19:10",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-16 16:00:36",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35034674,
          "experienceClass": 0,
          "timeScheduleId": 26203681,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-17 20:20-21:10",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 18193,
          "lesson": "29 : Unit8 Lesson1 Mammal and Non-mammal ",
          "assessClassStatus": 0,
          "dateTime": "2024-10-17 20:30-20:55",
          "assessClass": 0,
          "stuId": 571805,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": null,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": "3055534",
          "skype": "",
          "phone": "13701826640",
          "userName": "SusanYoYo",
          "leval": null,
          "age": 8,
          "sex": 0,
          "lessonPlan": "G1 Pre-intermediate（新版）  Unit8 Lesson1 Mammal and Non-mammal ",
          "localTime": "2024-10-17 20:30-20:55",
          "classFileList": [
            {
              "lrId": 21231,
              "fileName": "Pre-intermediate-2020-U08-L01-V4.pdf",
              "fileType": "pdf",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 0,
          "enterTime": "2024-10-17 20:20-21:10",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-16 11:23:58",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35034733,
          "experienceClass": 0,
          "timeScheduleId": 24504943,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-17 20:50-21:40",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 18227,
          "lesson": "23 : Unit6 Lesson3 Animals and Plants",
          "assessClassStatus": 0,
          "dateTime": "2024-10-17 21:00-21:25",
          "assessClass": 0,
          "stuId": 1202355,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": null,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": null,
          "skype": null,
          "phone": "13819162613",
          "userName": "Charlie",
          "leval": null,
          "age": 8,
          "sex": 1,
          "lessonPlan": "G1 Intermediate（新版）  Unit6 Lesson3 Animals and Plants",
          "localTime": "2024-10-17 21:00-21:25",
          "classFileList": [
            {
              "lrId": 21265,
              "fileName": "Intermediate-U06-L03-2020-V3.pdf",
              "fileType": "pdf",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 0,
          "enterTime": "2024-10-17 20:50-21:40",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-03 00:10:02",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35035087,
          "experienceClass": 0,
          "timeScheduleId": 26225601,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-17 21:20-22:10",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 18743,
          "lesson": "36 : Unit9 Lesson4 Plants",
          "assessClassStatus": 0,
          "dateTime": "2024-10-17 21:30-21:55",
          "assessClass": 0,
          "stuId": 1174256,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": null,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": "105921801",
          "skype": null,
          "phone": "18001355075",
          "userName": "Miya",
          "leval": null,
          "age": 2,
          "sex": 0,
          "lessonPlan": "G1 Intermediate Plus（新版）  Unit9 Lesson4 Plants",
          "localTime": "2024-10-17 21:30-21:55",
          "classFileList": [
            {
              "lrId": 21921,
              "fileName": "Intermediate-Plus-U09-L04-2021-V1.pdf",
              "fileType": "pdf",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 0,
          "enterTime": "2024-10-17 21:20-22:10",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-03 00:10:02",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35035128,
          "experienceClass": 0,
          "timeScheduleId": 25825979,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-17 21:50-22:40",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 3127,
          "lesson": "75 : TV Series",
          "assessClassStatus": 0,
          "dateTime": "2024-10-17 22:00-22:25",
          "assessClass": 0,
          "stuId": 1055332,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": null,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": "253118721",
          "skype": null,
          "phone": "13626114323",
          "userName": "Cindy",
          "leval": "3",
          "age": 9,
          "sex": 1,
          "lessonPlan": "生活口语100篇 Daily English  TV Series",
          "localTime": "2024-10-17 22:00-22:25",
          "classFileList": [
            {
              "lrId": 991,
              "fileName": "DE-L75-V1.pdf",
              "fileType": "pdf",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 0,
          "enterTime": "2024-10-17 21:50-22:40",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-03 00:10:02",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35172310,
          "experienceClass": 1,
          "timeScheduleId": null,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-18 15:20-16:10",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 17612,
          "lesson": "1 : The sound of letter a",
          "assessClassStatus": 0,
          "dateTime": "2024-10-18 15:30-15:55",
          "assessClass": 0,
          "stuId": 1424435,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": 1,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": null,
          "skype": null,
          "phone": "18060939187",
          "userName": "Peter",
          "leval": null,
          "age": 2,
          "sex": 1,
          "lessonPlan": "Super phonics  The sound of letter a",
          "localTime": "2024-10-18 15:30-15:55",
          "classFileList": [
            {
              "lrId": 20452,
              "fileName": "SuperPhonics-U01-L01.pdf",
              "fileType": "pdf",
              "fileUrl": null
            },
            {
              "lrId": 20453,
              "fileName": "SuperPhonics-U01-L01.mp3",
              "fileType": "mp3",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 1,
          "enterTime": "2024-10-18 15:20-16:10",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-16 10:08:41",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35041879,
          "experienceClass": 0,
          "timeScheduleId": 26098637,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-18 16:20-17:10",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 18709,
          "lesson": "42 : Unit11 Lesson2 Action Verbs",
          "assessClassStatus": 0,
          "dateTime": "2024-10-18 16:30-16:55",
          "assessClass": 0,
          "stuId": 1301629,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": null,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": null,
          "skype": null,
          "phone": "18202439068",
          "userName": "Sophia",
          "leval": null,
          "age": 7,
          "sex": 0,
          "lessonPlan": "GK Basic Plus（新版）  Unit11 Lesson2 Action Verbs",
          "localTime": "2024-10-18 16:30-16:55",
          "classFileList": [
            {
              "lrId": 21887,
              "fileName": "Basic-Plus-2020-U11-L02-V2.pdf",
              "fileType": "pdf",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 1,
          "enterTime": "2024-10-18 16:20-17:10",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-16 10:45:42",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35041981,
          "experienceClass": 0,
          "timeScheduleId": 26038214,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-18 16:50-17:40",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 18188,
          "lesson": "24 : Unit6 Lesson4 Body Matters",
          "assessClassStatus": 0,
          "dateTime": "2024-10-18 17:00-17:25",
          "assessClass": 0,
          "stuId": 1191161,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": 0,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": null,
          "skype": null,
          "phone": "15801436655",
          "userName": "Willson",
          "leval": null,
          "age": 10,
          "sex": 1,
          "lessonPlan": "G1 Pre-intermediate（新版）  Unit6 Lesson4 Body Matters",
          "localTime": "2024-10-18 17:00-17:25",
          "classFileList": [
            {
              "lrId": 21226,
              "fileName": "Pre-intermediate-2020-U06-L04-V2.pdf",
              "fileType": "pdf",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 1,
          "enterTime": "2024-10-18 16:50-17:40",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-04 00:10:02",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35155543,
          "experienceClass": 0,
          "timeScheduleId": null,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-18 17:20-18:10",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 18386,
          "lesson": "20 : Unit5 Lesson4 Fruits",
          "assessClassStatus": 0,
          "dateTime": "2024-10-18 17:30-17:55",
          "assessClass": 0,
          "stuId": 724724,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": 0,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": null,
          "skype": null,
          "phone": "13888288675",
          "userName": "Helen",
          "leval": "2",
          "age": 7,
          "sex": 1,
          "lessonPlan": "GK Starter（新版）  Unit5 Lesson4 Fruits",
          "localTime": "2024-10-18 17:30-17:55",
          "classFileList": [
            {
              "lrId": 21486,
              "fileName": "Starter-2020-U05-L04-V3.pdf",
              "fileType": "pdf",
              "fileUrl": null
            },
            {
              "lrId": 21487,
              "fileName": "Starter-U05-L04-V1.mp3",
              "fileType": "mp3",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 1,
          "enterTime": "2024-10-18 17:20-18:10",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-14 19:42:27",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35042241,
          "experienceClass": 0,
          "timeScheduleId": 25876982,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-18 17:50-18:40",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 20683,
          "lesson": "28 : Unit7 Lesson4 Look at the sign",
          "assessClassStatus": 0,
          "dateTime": "2024-10-18 18:00-18:25",
          "assessClass": 0,
          "stuId": 664582,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": null,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": "1111111",
          "skype": "0",
          "phone": "13868949821",
          "userName": "Jeremy",
          "leval": "2",
          "age": 5,
          "sex": 1,
          "lessonPlan": "Starter  Unit7 Lesson4 Look at the sign",
          "localTime": "2024-10-18 18:00-18:25",
          "classFileList": [
            {
              "lrId": 25300,
              "fileName": "ME-Parenting-Starter-U07-L04.pdf",
              "fileType": "pdf",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 1,
          "enterTime": "2024-10-18 17:50-18:40",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-04 00:10:02",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35101763,
          "experienceClass": 0,
          "timeScheduleId": null,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-18 18:20-19:10",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 16254,
          "lesson": "6 : Go,Go,Go",
          "assessClassStatus": 0,
          "dateTime": "2024-10-18 18:30-18:55",
          "assessClass": 0,
          "stuId": 972237,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": 0,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": "419279893",
          "skype": "123456789",
          "phone": "15195073005",
          "userName": "Mark",
          "leval": "4",
          "age": 7,
          "sex": 1,
          "lessonPlan": "Raz-AA  Go,Go,Go",
          "localTime": "2024-10-18 18:30-18:55",
          "classFileList": [
            {
              "lrId": 19036,
              "fileName": "RAZ_AA_L06.pdf",
              "fileType": "pdf",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 1,
          "enterTime": "2024-10-18 18:20-19:10",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-09 16:43:08",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35124226,
          "experienceClass": 0,
          "timeScheduleId": null,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-18 18:50-19:40",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 18392,
          "lesson": "26 : Unit7 Lesson1 Animals",
          "assessClassStatus": 0,
          "dateTime": "2024-10-18 19:00-19:25",
          "assessClass": 0,
          "stuId": 1292516,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": 0,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": null,
          "skype": null,
          "phone": "15903399703",
          "userName": "student",
          "leval": null,
          "age": 5,
          "sex": 1,
          "lessonPlan": "GK Starter（新版）  Unit7 Lesson1 Animals",
          "localTime": "2024-10-18 19:00-19:25",
          "classFileList": [
            {
              "lrId": 21497,
              "fileName": "Starter-2020-U07-L01-V1.pdf",
              "fileType": "pdf",
              "fileUrl": null
            },
            {
              "lrId": 21498,
              "fileName": "Starter-U07-L01-V1.mp3",
              "fileType": "mp3",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 1,
          "enterTime": "2024-10-18 18:50-19:40",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-16 19:26:58",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35044126,
          "experienceClass": 0,
          "timeScheduleId": 25874898,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-18 21:20-22:10",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 13006,
          "lesson": "58 : Perdix invents the saw",
          "assessClassStatus": 0,
          "dateTime": "2024-10-18 21:30-21:55",
          "assessClass": 0,
          "stuId": 1223692,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": null,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": "704555247",
          "skype": null,
          "phone": "17800824323",
          "userName": "Zoe",
          "leval": null,
          "age": 7,
          "sex": 0,
          "lessonPlan": "加州小学wonders G3  Perdix invents the saw",
          "localTime": "2024-10-18 21:30-21:55",
          "classFileList": [
            {
              "lrId": 13746,
              "fileName": "JZ_Wonders_G3_TEA_L058.pdf",
              "fileType": "pdf",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 1,
          "enterTime": "2024-10-18 21:20-22:10",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-16 15:47:01",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        },
        {
          "datebookId": 35044267,
          "experienceClass": 0,
          "timeScheduleId": 25825980,
          "isOrgClass": 0,
          "status": 0,
          "classStatus": "Waiting </br> You can enter class in 2024-10-18 21:50-22:40",
          "dbClassStatus": 0,
          "commentTime": null,
          "endTime": null,
          "feedback": -1,
          "lessonId": 3128,
          "lesson": "76 : What's in Your Bag?",
          "assessClassStatus": 0,
          "dateTime": "2024-10-18 22:00-22:25",
          "assessClass": 0,
          "stuId": 1055332,
          "tool": "说客英语",
          "toolNum": null,
          "liveToolType": 6,
          "beginTime": null,
          "isFirstCourse": null,
          "flower": 0,
          "stuResourceUrl": null,
          "stuResourceName": null,
          "showStuComment": null,
          "assessType": 0,
          "qq": "253118721",
          "skype": null,
          "phone": "13626114323",
          "userName": "Cindy",
          "leval": "3",
          "age": 9,
          "sex": 1,
          "lessonPlan": "生活口语100篇 Daily English  What's in Your Bag?",
          "localTime": "2024-10-18 22:00-22:25",
          "classFileList": [
            {
              "lrId": 992,
              "fileName": "DE-L76-V1.pdf",
              "fileType": "pdf",
              "fileUrl": null
            }
          ],
          "uploadFile": null,
          "isOpenBegin": 1,
          "enterTime": "2024-10-18 21:50-22:40",
          "isEnterClass": 0,
          "publicClassId": null,
          "cancelAvailable": 1,
          "editAble": null,
          "showForStudent": 0,
          "updateTime": "2024-10-04 00:10:02",
          "showBindFile": 0,
          "planClass": 0,
          "planStatus": null,
          "closeRoom": 0,
          "learnDemandSubmit": 0
        }
      ],
      "beginDate": "2024-10-17",
      "endDate": "2024-10-18",
      "teacherArea": 3
    },
    "totalCount": 18,
    "showPermission": false
  };
  return mockData;
}