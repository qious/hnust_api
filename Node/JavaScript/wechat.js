// Generated by CoffeeScript 1.10.0
var config, getData, logger, message, request, wechat;

request = require('request');

config = require('./config');

logger = config.logger;

getData = function(method, params, callback) {
  var options;
  params.secret = config.wechat.secret;
  options = {
    url: config.outUrl + "/weixin/" + method,
    form: params
  };
  return request.post(options, function(err, res, body) {
    var error, error1;
    if (err) {
      return callback(err);
    }
    params.secret = void 0;
    try {
      body = JSON.parse(body);
    } catch (error1) {
      error = error1;
      logger.error("JSON解析失败：" + error);
      logger.error("JSON如下：" + body);
      return callback("JSON解析失败");
    }
    return callback(null, body);
  });
};

message = function(msg, session, callback) {
  var answer, key, method, params;
  switch (msg.MsgType) {
    case 'text':
      key = msg.Content;
      break;
    case 'event':
      session.state = '';
      switch (msg.Event) {
        case 'click':
          key = msg.EventKey;
      }
  }
  params = {
    uid: msg.FromUserName,
    sid: msg.FromUserName
  };
  if (key === '?' || key === '？' || key === '菜单' || key === '首页' || key === '索引') {
    session.state = '';
    answer = '已经成功返回主菜单';
  } else if (session.state === '输入密码') {
    method = session.last.method;
    params = session.last.params;
    params.passwd = key;
  } else if (session.state === '绑定Ta') {
    method = session.last.method;
    params = session.last.params;
    params.sid = key;
  } else {
    if (key === '我的成绩' || key === '我的课表' || key === '我的考试') {
      key = key.replace(/^我的/, '');
    } else if (key === 'Ta的成绩' || key === 'Ta的课表' || key === 'Ta的考试') {
      if (!session.ta) {
        session.state = '绑定Ta';
        answer = "请回复Ta的10位学号：";
      }
      params.sid = session.ta;
      key = key.replace(/^Ta的/, '');
    }
    switch (key) {
      case '成绩':
        method = 'score';
        break;
      case '课表':
        method = 'schedule';
        break;
      case '考试':
        method = 'exam';
        break;
      case '解绑Ta':
        session.ta = '';
        answer = "解绑Ta完成";
        break;
      default:
        if (!key) {
          return;
        }
        method = 'student';
        params.key = key === '学生' ? '' : key;
    }
  }
  session.last = {
    method: method,
    params: params
  };
  if (answer) {
    return callback(null, answer, session);
  }
  return getData(method, params, function(err, res) {
    var ref;
    if (err) {
      return callback(err);
    }
    res.code = parseInt(res.code);
    switch (res.code) {
      case -1:
        return callback(null, res.msg, session);
      case 0:
        if (session.state === '绑定Ta') {
          session.ta = params.sid;
        }
        if ((ref = session.state) === '输入密码' || ref === '绑定Ta') {
          session.state = '';
        }
        return callback(null, res.data, session);
      case 4:
        session.state = '输入密码';
        return callback(null, res.msg, session);
      default:
        return callback(res.msg);
    }
  });
};

wechat = function(req, res, next) {
  var mmcKey, msg;
  msg = req.weixin;
  mmcKey = "wechat_session_" + msg.FromUserName;
  return config.mmc.get(mmcKey, function(err, session) {
    if (err) {
      return res.reply('服务器错误。');
    }
    return message(msg, session || {}, function(err, answer, session) {
      if (err) {
        logger.error('message error', err);
        return res.reply('');
      }
      config.mmc.set(mmcKey, session, 0, function(err) {
        if (err) {
          return logger.error('memcache error', err);
        }
      });
      return res.reply(answer);
    });
  });
};

module.exports = wechat;
