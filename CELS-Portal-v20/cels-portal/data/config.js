/* Site configuration. Edit here to change navigation, users, or appointment rules. */
window.CELS_CONFIG={
 payAt:"CELS office, Room 302", /* where students pay for 1-on-1 sessions */
 levels:{A1:"Pre-IELTS Foundations",A2:"IELTS Foundations",B1:"IELTS Level 1",B2:"IELTS Level 2",C1:"IELTS Level 3",C2:"Advanced IELTS / Academic English"},
 nav:{
  student:[["dashboard","Dashboard","🏠"],["courses","Courses","📚"],["calendar","Calendar","📅"],["inbox","Inbox","✉️"],["free-talk","Free Talk","💬"],["one-on-one","1-on-1","🧑‍🏫"],["student-buddy","Student Buddy","🤝"],["account","Account","👤"]],
  teacher:[["dashboard","Dashboard","🏠"],["courses","Courses","📚"],["calendar","Calendar","📅"],["inbox","Inbox","✉️"],["free-talk","Free Talk","💬"],["one-on-one","1-on-1","🧑‍🏫"],["activities","Activities & Events","🎉"],["forms","Forms & Requests","🗂️"],["account","Account","👤"]],
  admin:[["dashboard","Dashboard","🏠"],["users","Users","👥"],["placement","Placement","🎯"],["ielts-program","IELTS","📖"],["courses","Courses","📚"],["content","Content","🗂️"],["enrollments","Enrollments","🧾"],["appointments","Appointments","📅"],["student-progress","Progress","📈"],["results","Results","✅"],["reports","Reports","📊"],["workload","Workload","🧮"],["messages","Messages","✉️"],["forms","Forms","📋"],["system-settings","Settings","⚙️"]]
 },
 /* DEMO ONLY. Real authentication must happen on the server. */
 users:[
  {id:"u1",email:"john@cels.edu",password:"student123",role:"student",status:"active",studentNumber:"202610001",level:"B1",first:"John",middle:"",last:"Smith",nickname:"John"},
  {id:"u2",email:"kath@cels.edu",password:"teacher123",role:"teacher",status:"active",employeeNumber:"T-0042",first:"Kath",middle:"",last:"",nickname:"Kath",department:"IELTS"},
  {id:"u3",email:"admin@cels.edu",password:"admin123",role:"admin",status:"active",first:"CELS",middle:"",last:"Admin",nickname:"Admin"},
  {id:"u4",email:"paused@cels.edu",password:"x",role:"student",status:"suspended",first:"Sam",last:"Lee",nickname:"Sam"}
 ],
 /* Calendar window and the regular school day. Times are 24h HH:MM. */
 calendar:{startHour:8,endHour:18,classDay:["08:30","16:00"],lunch:["11:40","12:50"]},
 /* Durations follow the October sheets: Free Talk blocks are 30 min, periods 5 and 6 are 50 min. */
 appointmentTypes:{"free-talk":{name:"Free Talk",minutes:30,capacity:1},"one-on-one":{name:"1-on-1",minutes:50,capacity:1,requiresPayment:true},"student-buddy":{name:"Student Buddy",minutes:50,capacity:3}}
};
