/*
   Copyright 2021 Richard Vassilaros 
*/

/*
Stuff that needs persisted across the system.
*/

const db = require('./db');
const ObjectID = db.ObjectID;
var logger = require('./log').logger;
var TheSystem = null;

// debug or release, etc
const quib_cfg = require('./quib_config.json');

class System {
  constructor(sonj) {
    if (sonj._id)
      this.id = sonj._id;
    this.name = sonj.name;
    this.current_invite_id = sonj.current_invite_id ? sonj.current_invite_id : 0;
    this.invitations = [];
    sonj.invitations.forEach((item, idx) => {
      this.invitations.push(new Invitation(item.id, item.sender_id, item.invitee_id, item.invitee_name, item.invitee_email,
        item.invite_date, item.status));
      });
  }


  static get_system() {
    if (TheSystem) return TheSystem;
    else {
      let id;
      let sys = db.get_db().collection('system').findOne()
        .then((sys) => {
          sys ? TheSystem = new System(sys) : TheSystem = new System({"invitations" : []});
          return TheSystem;
        }) 
        .catch((e) => console.error(e));
    }
  }

  new_invitation(sender_id, invite_name, invite_email) {
    let invite = new Invitation(++this.current_invite_id, sender_id, null, invite_name, invite_email);   
    this.invitations.push(invite);
    this.save();
    return invite.id;
  }

  remove_invitation(id) {
    this.invitations = this.invitations.filter(
      i => i.id != id
    );
    this.save();
  }

  remove_invitations(uid, ids) {
    let id_arr = ids.split(":");
    id_arr.forEach(id => {
      this.invitations = this.invitations.filter(
        i => i.id != id
      );
    });
    this.save();
  }

  get_invitation_JSONS() {
    var ret_val = [];
    this.invitations.forEach((item, idx) => {
      let js = item.get_JSON();
      ret_val.push(js);
    });
    return ret_val;
  }

  get_invitation(iid) {
    let ret_val = null;
    this.invitations.forEach(item => {
      if (item.id == iid)  ret_val = item;
    });
    return ret_val;
  }

  get_users_invitations(uid) {
    var ret_val = [];
    this.invitations.forEach((item, idx) => {
      if (item.sender_id == uid) ret_val.push(item);
    });
    return ret_val;
  }

  get_JSON() {
    return {
      "name" : "system",
      "current_invite_id" : this.current_invite_id,
      "invitations" : this.get_invitation_JSONS()
    }
  }

  save() {
    let sys_js =  this.get_JSON();
    let q = { name : sys_js.name};
    let update =
      { $set:  sys_js};
    const options = { upsert: true };
    var result = db.get_db().collection("system").updateOne(q, update, options)
      .then((result) => {
        if (result && result.upsertedId) {
            this.id = result.upsertedId._id;
        }
      })
      .catch((e) => {
        console.error(e);
      });
  }
 }

class Invitation {
  constructor(id, sender_id, invitee_id, invite_name, invite_email, invite_date, status) {
    this.id = id;
    this.sender_id = sender_id;
    this.invitee_id = invitee_id;
    this.invitee_name = invite_name;
    this.invitee_email = invite_email;
    !invite_date ? this.invite_date = Invitation.get_trimmed_date() : this.invite_date = invite_date;
    !status ? this.status = Invitation.pending : this.status = status;
  }

  get_JSON() {
    return {
      "id" : this.id,
      "sender_id" : this.sender_id,
      "invitee_id" : this.invitee_id,
      "invitee_name" : this.invitee_name,
      "invitee_email" : this.invitee_email,
      "invite_date" : this.invite_date,
      "status" : this.status
    }
  }

  static get_trimmed_date() {
    let tmp = Date();
    let parts = tmp.split(" ");
    return parts[0] + " " + parts[1] + " " + parts[2] + " " + parts[3] + " " + parts[4];
  }

  static none = -1;
  static pending = 1;
}

exports.System = System;