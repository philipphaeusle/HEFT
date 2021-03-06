let fs = require('fs');
let csvjson = require('csvjson');
let path = require('path');

let networkBandwidth=40;
let budget=2;//budget in euro

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
    size=size/1000000;
    return size / networkBandwidth; //in seconds
};

const takesTime=(id, instance)=>{
    let tmp=undefined;
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
const computAverageComunicationCostsAmongAllNodes=(i, j)=> {
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
        let c=computAverageComunicationCostsAmongAllNodes(i,j);
        let currentCost=c+computePriority(j);
        if(max<currentCost){
            max=currentCost;
        }
    });
    return w+max;
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

const checkIfTaskCompleted=(id,serverAssignments)=>{
    let found=undefined;
    serverAssignments.completedTasks.forEach(function(a){
        if(a.taskId===id){
            found=a;
        }
    });
    return found;
};

//implements the assign algorithm from https://en.wikipedia.org/wiki/Heterogeneous_Earliest_Finish_Time
function assignToBestWorker(task, serverAssignments) {
    let mustWaitFor=isDependentOn(task);
    let mustWaitForArray=[];
    let allFinished=true;
    mustWaitFor.forEach(function (id){
        let temp=checkIfTaskCompleted(id,serverAssignments);
        if(temp===undefined){
            allFinished= false;
        }else{
            mustWaitForArray.push(temp)
        }
    });

    if(!allFinished){
        return undefined
    }

    let availableList=serverAssignments.serverList;
    let bestStartTime=9999999999;
    let bestFinishTime=9999999999;
    let bestWorkerID;

    for (let i=0; i<price.length; i++){
        let earliestStartTime=0; //time when all tasks that are dependent are finished;
        mustWaitFor.forEach(function(w){
            if((w.finishTime + costs(w.serverId,price[i].id)) > earliestStartTime ){
                earliestStartTime=w.finishTime + costs(w.serverId,price[i].id);
            }
        });

        let startTime=Math.max(availableList[i], earliestStartTime);

        let finishTime=startTime+takesTime(task,price[i].id);
        if(bestFinishTime > finishTime ){
            bestStartTime=startTime;
            bestFinishTime=finishTime;
            bestWorkerID=i;
        }
    }

    serverAssignments.completedTasks.push({
        taskId:task,
        serverId:bestWorkerID,
        startTime:bestStartTime,
        tookTime:bestFinishTime-bestStartTime,
        finishTime:bestFinishTime
    });
    availableList[bestWorkerID]=bestFinishTime;
    return true;
}

function calcMakespan(data) {
    let result=0;
    data.forEach(function(d){
        if(d>result){
            result=d;
        }
    });
    return result;
}


const currentCostsForServers=(data)=>{
    let result={};
    result.single=[];
    result.total=0;
    let i=0;
    data.forEach(function(x){
        let hourInSeconds=3600;
        let time=x;
        let costsperHour=parseFloat(price[i].Price);
        let fullHours=Math.ceil(time/hourInSeconds);
        let t=fullHours*costsperHour;

        result.total+=t;
        result.single.push({
            server:i,
            time:x,
            chargedHours:fullHours,
            costs:t
        });
        i++;
    });

    return result;
};

//the function that assigns sorted task list to workers;
const assignToWorkers=(taskList)=>{
    let tempList=JSON.parse(JSON.stringify(taskList));
    let serverAssignments= {
        completedTasks:[], //an array of completed tasks, with their id, the server id they were assigned to, a starting time and an ending time;
        serverList:[], //an array for every server, when he is available
    };
    serverAssignments.serverList=new Array(price.length).fill(0); //assign a starttime

    let loop=true;
    let loopCount=0;
    while(tempList.length>0 && loop){
        loop=false;
        loopCount++;
        let temp=[];
        tempList.forEach(function(task){
            let couldAssignTask=assignToBestWorker(task.id,serverAssignments);
            if(couldAssignTask){
                loop=true;
            }else{
                //could not assign this task;
                temp.push(task);
                console.log('______________________');
                console.log(task.id);
                console.log("DEPENDS ON: "+isDependentOn(task.id));
                let arr=[];
                serverAssignments.completedTasks.forEach(function(x){
                    arr.push(x.taskId);
                });
                console.log("HAVE: "+arr);
            }
        });
        tempList=temp;
        if(!loop){
            console.log('could not assign all tasks, waiting..');
            serverAssignments.serverList.forEach(function(t){
                t+=0.1;  //increase waiting time + 0.1s
            })
        }
    }

    let arr=[];
    serverAssignments.completedTasks.forEach(function(x){
        arr.push(x.taskId);
    });
    return serverAssignments;
};

//HERE THE FUNCTIONS FOR LOSS START

const executionCosts=(task,instance)=>{
    let time=takesTime(task,instance);
    let hourCost=price[instance].Price;
    let costsSecond=hourCost/3600;
    return parseFloat(costsSecond*time);
};

const lossWeight=(task,oldInstance,newInstance)=>{
    let a=takesTime(task,newInstance);
    let b=takesTime(task,oldInstance);
    let c=executionCosts(task,oldInstance);
    let d=executionCosts(task,newInstance);

    if(c<=d){
        return 0;
    }
    return (a-b)/(c-d)
};

const reschedule=(taskId, newServer,data)=>{


/*TODO:  rescheule task from one server to the other
* */
};

const lossAlgorithm=(data)=>{
    let costs=currentCostsForServers(data.serverList).total;
    if(costs <= budget){
        return data;
    }
    //budget is exceeded
    //Build an array A[num_tasks][num_machines]
    let array=[data.completedTasks.length];
    for(let i=0; i<data.completedTasks.length; i++){
        array[i]=[data.serverList.length];
        for(let j=0; j<data.serverList.length; j++){
            if(data.completedTasks[i].serverId===j){
                array[i][j]=0;
            }else{
                array[i][j]=lossWeight(data.completedTasks[i].taskId,data.completedTasks[i].serverId,j);
            }
        }
    }
    let condition=costs>budget;
    let changed=true;
    console.table(array);
    //while condition and not all reassignments tried
    while(condition && changed){
        let low=undefined;
        let currI=0;
        let currJ=0;
        changed=false;
        for(let i=0; i<array.length; i++) {
            for (let j = 0; j < array[i].length; j++) {
                if(array[i][j]!==0 && (low ===undefined || array[i][j] < low)){
                    changed=true;
                    low=array[i][j];
                    currI=i;
                    currJ=j;
                }
            }
        }
        if(changed){
            //reschedule task i to machine j
            reschedule(currI,currJ,data);
            costs=currentCostsForServers(data.serverList).total;
            condition=costs>budget;
        }
    }
    if(!changed){
        console.log("ERROR while loss. could not find better solution")
    }
    return data;
};


let result=assignToWorkers(prioritize());
console.log("Makespan: "+calcMakespan(result.serverList)+" seconds");
console.table(result.completedTasks);
console.log("Total cost: "+ currentCostsForServers(result.serverList).total);
console.table(currentCostsForServers(result.serverList).single);
lossAlgorithm(result);







