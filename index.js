const linebot = require('linebot');
const express = require('express');
const fetch = require('node-fetch');
const API_ROOT = 'https://parkingbotserver.herokuapp.com';

let changeNumplateUser = [];

const bot = linebot({
  channelId: '1580794985',
  channelSecret: 'f39b9a4c0fa9717935751b9e3a5e6734',
  channelAccessToken: 'j3KMY9JWyWDM51AujBompVj/H0pg/tZ4MCtptfdVj+iKxu4AgdzYu63MqyQw5I6f7oQkAaMrafX3oxIborJxshGOhZszw1wvOmJh/wuS+FtlRCFDXurIePB/Yxhlz/OtDdhbo98y873Xnq0TgJ7wiAdB04t89/1O/w1cDnyilFU='
});

function reply(event, msg) {
  event.reply(msg)
    .then(function(data) { console.log(msg); })
    .catch(function(error) { console.log(error); });
}

function queryFee(event, numplate) {
  fetch(`${API_ROOT}${'/queryFee'}`, {
      method: 'GET',
      headers: {
        'numplate': numplate,
        'uid': event.source.userId
      },
    })
    .then((response) => response.json())
    .then((responseJson) => {
      console.log(responseJson);
      let altText = responseJson.success ? "未繳費用: " + responseJson.ticketNum + '筆共' + responseJson.totalFare + '元整\u2757' : "未繳費用: " + '0筆共0元整\u2757';
      let msg = {
        "type": "template",
        "altText": altText,
        "template": {
          "type": "buttons",
          "title": '車牌: ' + numplate,
          "text": altText,
          "actions": [{
            "type": "postback",
            "label": "更改車牌",
            "data": "action=changeNumplateAction&userId=" + event.source.userId
          }, {
            "type": "postback",
            "label": "繳費",
            "data": "action=payment"
          }]
        }
      };
      reply(event, msg);
    })
}

/*for postback event from buttum template*/
bot.on('postback', function(event) {
  console.log("------postback-------");
  console.log(event);
  console.log("------postback-------");
  if (event.type == 'postback') {
    let msg = ''
    let dict = {};
    let data = event.postback.data.split("&");
    for (var i = 0; i < data.length; i++) {
      let d = data[i].split("=")
      dict[d[0]] = d[1];
    }
    console.log(dict);
    if (dict['action'] == 'parkingReply') {
      msg = {
        "type": "template",
        "altText": "回報車位已滿嗎?",
        "template": {
          "type": "confirm",
          "text": dict['parkingid'] + "車位已滿?",
          "actions": [{
            "type": "postback",
            "label": "是",
            "data": "action=parkingReplyAnswer&parkingReplyAnswer=yes&parkingid=" + dict['parkingid'],
            "displayText": "是，車位已滿"
          }, {
            "type": "postback",
            "label": "否",
            "data": "action=parkingReplyAnswer&parkingReplyAnswer=no&parkingid=" + dict['parkingid'],
            "displayText": "否，取消回報"
          }]
        }
      };
      reply(event, msg);
    };
    if (dict['action'] == 'parkingReplyAnswer') {
      if (dict['parkingReplyAnswer'] == 'yes') {
        msg = {
          'type': 'text',
          'text': '好喔 我知道了\n' + dict['parkingid'] + '\n車位已滿'
        }
      } else if (dict['parkingReplyAnswer'] == 'no') {
        msg = {
          'type': 'text',
          'text': '了解\n' + dict['parkingid'] + '\n回報錯誤'
        }
      }
      reply(event, msg);
    };

    if (dict['action'] == 'changeNumplateAction') {
      msg = {
        'type': 'text',
        'text': '請輸入車牌號碼\n(如：EGG-8740)'
      }
      changeNumplateUser.push(dict['userId']);
      reply(event, msg);
    };

    if (dict['action'] == 'payment') {
      msg = {
        'type': 'text',
        'text': '此功能尚未解鎖，\n如有任何疑問或建議，請聯繫oeo@3drens.com。'
      }
      reply(event, msg);
    };
  }
});


/*for message event from user*/
bot.on('message', function(event) {
  console.log(event);
  let msg = {
    "type": "text",
    "text": "寶寶看不懂你在說什麼，你要不要看看下方功能表?"
  };
  /*for txet message*/
  if (event.message.type == 'text') {
    if (event.message.text.indexOf('繳費查詢') != -1) {
      fetch(`${API_ROOT}${'/getMemberPlate'}`, {
          method: 'GET',
          headers: { 'uid': event.source.userId },
        })
        .then((response) => response.json())
        .then((responseJson) => {
          console.log(responseJson);
          let numplate = responseJson.success ? responseJson.numplate : '000-000';
          queryFee(event, numplate);
        })

    } else if (changeNumplateUser.indexOf(event.source.userId) != -1) {
      if (event.message.text.match('[a-zA-Z0-9]+-?[a-zA-Z0-9]+')) {
        fetch(`${API_ROOT}${'/saveMemberPlate'}`, {
            method: 'GET',
            headers: {
              'uid': event.source.userId,
              'numplate': event.message.text
            },
          })
          .then((response) => response.json())
          .then((responseJson) => {
            console.log(responseJson);
            if (responseJson.success) {
              msg = {
                "type": "text",
                "text": "已成功更改車牌為： " + event.message.text
              };
              changeNumplateUser=changeNumplateUser.filter((i)=>{ return i != event.source.userId; });
              reply(event, msg);
            }
          })
      } else {
        msg = {
          "type": "text",
          "text": "更改失敗\n請輸入車牌格式\n ex: XXX-XXX"
        };
        reply(event, msg);
      }
    } else {
      reply(event, msg);
    }

  }


  /*for sticker response*/
  if (event.message.type == 'sticker') {
    msg = {
      "type": "sticker",
      "packageId": "3",
      "stickerId": Math.floor(Math.random() * (259 - 180) + 180)
    };
    reply(event, msg);
  }


  /*for location message */
  if (event.message.type == 'location') {
    fetch(`${API_ROOT}${'/getParking'}`, {
        method: 'GET',
        headers: {
          'location': JSON.stringify({ 'latitude': event.message.latitude, 'longitude': event.message.longitude }),
          'uid': event.source.userId
        },
      })
      .then((response) => response.json())
      .then((responseJson) => {
        console.log(responseJson);
        let results = responseJson.results.filter((i) => { return i.obj.roadSegAvail != 0 });
        if (results.length == 0) {
          msg = {
            "type": "text",
            "text": "此地區本寶寶不支援\n或附近沒有可用停車格，\n如有任何疑問或建議，請聯繫oeo@3drens.com\u2757"
          }
        } else {
          let cards = [];
          let today = new Date(new Date().getTime() + 8 * 3600000);
          for (var i = 0; i < results.length; i++) {
            let UpdateTm = new Date(results[i].obj.roadSegUpdateTm);
            let roadSegTm = results[i].obj.roadSegTmStartEnd.split('-');
            let time = (today.getTime() - UpdateTm.getTime()) / 3600000;
            let zoom = 15;
            time = time < 1 ? parseInt(time * 60) + '分鐘前' : parseInt(time) + '小時前';
            parseInt(results[i].dis * 6371000) < 300 ? zoom = 16 : 14;
            parseInt(results[i].dis * 6371000) < 100 ? zoom = 17 : 16;
            today.getHours() < parseInt(roadSegTm[0].split(':')[0]) || today.getHours() > parseInt(roadSegTm[1].split(':')[0]) ? roadSegTm = '免費' : roadSegTm = results[i].obj.roadSegFee + '/時';
            cards[i] = {
              "thumbnailImageUrl": "https://maps.googleapis.com/maps/api/staticmap?center=" + event.message.latitude + "," + event.message.longitude + "&zoom=" + zoom + "&size=400x600&maptype=roadmap&markers=color:red%7C" + event.message.latitude + "," + event.message.longitude + "&markers=icon:https://chart.apis.google.com/chart?chst=d_map_pin_icon%26chld=parking%257C000000%7C" + results[i].obj.roadSegLocation[1] + "," + results[i].obj.roadSegLocation[0] + "&key=AIzaSyCmLAVu2NcqvV0YuxwcI-oRsRYoev8EWUE",
              "imageBackgroundColor": "#000000",
              "title": i + 1 + '. 距離' + parseInt(results[i].dis * 6371000) + 'm\n' + roadSegTm,
              "text": results[i].obj.roadSegName + '(路邊停車格)\n總車位: ' + results[i].obj.roadSegTotal + ' 剩餘車位: ' + results[i].obj.roadSegAvail + '\n\u23F0最後更新:' + time,
              "defaultAction": {
                "type": "uri",
                "label": "View detail",
                "uri": "https://www.here.com/directions/drive/end:" + results[i].obj.roadSegLocation[1] + "," + results[i].obj.roadSegLocation[0],
              },
              "actions": [{
                  "type": "uri",
                  "label": "導航到停車位",
                  "uri": "https://www.here.com/directions/drive/end:" + results[i].obj.roadSegLocation[1] + "," + results[i].obj.roadSegLocation[0],
                },
                {
                  "type": "uri",
                  "label": "查看街景",
                  "uri": "https://maps.google.com/maps?q=&layer=c&cbll=" + results[i].obj.roadSegLocation[1] + "," + results[i].obj.roadSegLocation[0] + "&cbp=12,270",
                },
                {
                  "type": "postback",
                  "data": "action=parkingReply&parkingid=" + results[i].obj.roadSegName + '(路邊停車格)',
                  "label": "回報車位已滿",
                  "displayText": "回報車位已滿"
                }
              ]
            };
          }
          cards.splice(5);
          msg = {
            "type": "template",
            "altText": "附近停車位置",
            "template": {
              "type": "carousel",
              "columns": cards,
              "imageAspectRatio": "rectangle",
              "imageSize": "cover"
            }
          }
        }
        reply(event, msg);
      })
  };

});

const app = express();
const linebotParser = bot.parser();
app.post('/', linebotParser);

//push on heroku, need to change port
const server = app.listen(process.env.PORT || 8080, function() {
  let port = server.address().port;
  console.log("App now running on port", port);
});