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

//this function returns an array of task ids, that need the result of task with (id)
const dependsOn=(id)=>{
    let result=[];
    let trafficCopy=JSON.parse(JSON.stringify(traffic));
    trafficCopy.forEach(function (d){
        if(d.task===id){
            delete d.task;
            for (key in d){
                if(d[key]!==''){
                    result.push(key);
                }
            }
        }

    });
    return result;
};

//this function returns an array of task ids, that are must be finished before the task with(id) can start
const isDependentOn=(id)=>{
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
    let size=temp[toID];
    return size / networkBandwidth; //in seconds
};

const takesTime=(id, instance)=>{
    let tmp;
   time.forEach(function(t){
       if(t.task==id){
           tmp = t[instance];
       }
   });
   return parseFloat(tmp);
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


const averageComputationCostAmongAllNodes=(id)=> {
    let count=0;
    price.forEach(function (instance){
        count+=takesTime(id,instance.id);
    });
    return (count/price.length);
};

//conputes the Cij from Prioritizing tasks (https://en.wikipedia.org/wiki/Heterogeneous_Earliest_Finish_Time)
const computAverageComputationCostsAmongAllNodes=(i, j)=> {
    let all=0;
    for(let t=0; t<=price.length-1;t++){
        all=all+costs(i,j);
    }
    return all/price.length;
};

//implements the prioritizing algorithm from https://en.wikipedia.org/wiki/Heterogeneous_Earliest_Finish_Time
//task is an ID of a task
const computePriority=(task)=>{
    let w=averageComputationCostAmongAllNodes(task);
    let succ=dependsOn(task);
    let i=task;

    let max=0;
    succ.forEach(function(j){
        let c=computAverageComputationCostsAmongAllNodes(i,j);
        let currentCost=c+computePriority(j);
        if(max<currentCost){
            max=currentCost;
        }
    });
    return w+max;
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

//returns a prioritized and sorted list of tasks
const prioritize=()=>{
    let result=[];
    getAllTasks().forEach(function(t){
        result.push({
            priorityScore: computePriority(t),
            id:t
        });
    });
    result.sort((a, b) => b.priorityScore - a.priorityScore);
    return result;
};

//the function that assigns sorted task list to workers;
const assignToWorkers=(taskList)=>{

};

assignToWorkers(prioritize());






