let fs = require('fs');
let csvjson = require('csvjson');
let path = require('path');

let networkBandwidth=40;
let budget=37;//budget in euro

let inputPrice='./assignments/price.csv';
let inputTime='./assignments/task_time_instance.csv';
let inputTraffic='./assignments/traffic_relation.csv';

let dataPrice = fs.readFileSync(path.join(__dirname, inputPrice), { encoding : 'utf8'});
let dataTime = fs.readFileSync(path.join(__dirname, inputTime), { encoding : 'utf8'});
let dataTraffic = fs.readFileSync(path.join(__dirname, inputTraffic), { encoding : 'utf8'});

let options = {
    delimiter : ',',
    quote     : '"'
};

let price=csvjson.toObject(dataPrice, options);
let time=csvjson.toObject(dataTime, options);
let traffic=csvjson.toObject(dataTraffic, options);


const dependsOn=(id)=>{
    let result=[];
    let trafficCopy=JSON.parse(JSON.stringify(traffic));
    trafficCopy.forEach(function (d){
        let t=d.task;
        delete d.task;
        for (key in d){
            if (d[key]!=='' && key==id){
                result.push(t);
            }
        }
    });
    return result;
};

const costs=(fromID, toID)=>{
    let temp={};
    let trafficCopy=JSON.parse(JSON.stringify(traffic));
    trafficCopy.forEach(function (d){
        if(d.task==fromID){
            temp=d;
        }
    });
    return temp[toID] / 40; //in seconds
};

const takesTime=(id, instance)=>{
    let tmp;
   time.forEach(function(t){
       if(t.task==id){
           tmp = t[instance];
       }
   });
   return tmp;
};

const getAllTasks=()=>{
    let tmp=[];
    time.forEach(function(t){
        tmp.push(t.task);
    });
    return tmp;
};

const getAllInstances=()=>{
    let tmp=[];
    price.forEach(function(p){
        tmp.push(p.id);
    });
    return tmp;
};

const comuteRandomSchedule=()=>{
    let timeCopy=JSON.parse(JSON.stringify(time));
    let processors=[];

    let tasks=getAllTasks();
    let instances=getAllInstances();

    while(tasks.length>0){
        let newTasks=[];
        let startLength=tasks.length;
        //do stuff
        for (let i=0; i<tasks.length;i++){

        }
        tasks=newTasks;
        if(startLength===tasks.length){
            //nothing happened, wait a little
        }
    }


};

comuteRandomSchedule();




