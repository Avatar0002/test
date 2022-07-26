import ChartUI from "./ChartUI";
import { ZC_COLORLIST, getDialChart, getDateForChart, getTimeStrForChart } from "./DashboardsCommon";
import { getChartData } from "./BluePrintUtils";
import { i18NProviderUtils } from 'fz-i18n';

export const constructSeriesData = (responseData, violationId, groupBy) => {
  let dataName = (groupBy=="hour" || groupBy=="status" || groupBy=="channel" || groupBy=="agent") ? "violationCount" : "violatedTicketsCount",
      seriesData = [],
      totalCount = 0,
      { slaMetricsData=[] } = responseData;

  slaMetricsData.forEach((dataObj)=>{
    let { value=null, violationCount=0, violatedTicketsCount=0, agentId=null, referenceValue=null, successCount=0 } = dataObj,
        dataCount =  (dataName=='violationCount') ? parseInt(violationCount) :  parseInt(violatedTicketsCount);
        violationCount = parseInt(violationCount);
        successCount = parseInt(successCount);
    let total = violationCount + successCount;

    if(groupBy=='date') {
      let dateStr = getDateForChart(value);
      seriesData.push([dateStr, dataCount]);
    }else if(groupBy=="hour"){
      let timeStr = getTimeStrForChart(value);
      seriesData.push([timeStr, dataCount]);
    }else if(groupBy=="status" && dataCount){
      seriesData.push([value, dataCount]);
    }else if(groupBy=="agent" && (dataCount || !seriesData.length)){
      seriesData.push([value, referenceValue, violationCount, successCount, total]);
    }else if(groupBy=="sla" && (parseInt(violationCount) || parseInt(successCount) || !seriesData.length)){
      seriesData.push([value, referenceValue, violationCount, successCount, total]);
    }
    totalCount += dataCount;
  });
  seriesData = totalCount ? seriesData : [];
  return { seriesData };
};

export const getConstructChartData = (respData, violationId, groupBy) =>{
  let violationCountTxt = `${i18NProviderUtils.getI18NValue('support.dashboard.violated')} ${i18NProviderUtils.getI18NValue('support.overview.count')}`,
      ticketsCountTxt = `${moduleMapKey.Cases.changed_sing_module} ${i18NProviderUtils.getI18NValue('support.overview.count')}`;
  if(groupBy=="date"){
    let { seriesData=[] } = constructSeriesData(respData, violationId, groupBy),
        isViolateTicketData = seriesData.length ? true : false,
        slaViolatedTicketObj = {};
    if(isViolateTicketData){
       slaViolatedTicketObj = getChartData(
            "date",
            ticketsCountTxt,
            [seriesData],
            ['bar'],
            [ticketsCountTxt],
            ["#ec5463"],
            false,
            true
          );
        slaViolatedTicketObj.chart.plot.plotoptions.bar.datalabels = { show: true };
    }
    return {
      slaViolatedTicketObj,
      isViolateTicketData
    };
  }
  else if(groupBy=="hour"){
    let { seriesData=[] } = constructSeriesData(respData, violationId, groupBy),
        violationByTimeObj = {},
        isViolateByTimeData = seriesData.length ? true : false;
    if(isViolateByTimeData){
      violationByTimeObj = getChartData(
        "Hour",
        violationCountTxt,
        [seriesData],
        ['line'],
        [violationCountTxt],
        ["#ec5463"],
        false,
        true
      );
      violationByTimeObj.chart.plot.plotoptions = {
        line : {
          mode: 'cardinal',
          marker: {
            innerFillColor: "#FFFFFF"
          }
        }
      };
    }
    return { violationByTimeObj, isViolateByTimeData };
  }
  else if (groupBy=="status"){
    let { seriesData } = constructSeriesData(respData, violationId, groupBy),
        violationByStatusObj = {},
        isViolateByStatusData = (seriesData.length) ? true : false;
    if(isViolateByStatusData){
      violationByStatusObj = getChartData(
        "Status",
        violationCountTxt,
        [seriesData],
        ['bar'],
        [violationCountTxt],
        ZC_COLORLIST,
        true,
        true
      );
      violationByStatusObj.chart.plot.plotoptions.bar.datalabels = { show: true };
    }
    return { violationByStatusObj, isViolateByStatusData };
  }
  else if(groupBy=="channel"){
    let { seriesData } = constructSeriesData(respData, violationId, "status"),
        violationByChnlObj = {},
        isViolateByChnlData = (seriesData.length) ? true : false;
    if(isViolateByChnlData){
      violationByChnlObj = getChartData(
            "Status",
            violationCountTxt,
            [seriesData],
            ['bar'],
            [violationCountTxt],
            ZC_COLORLIST,
            true,
            true
          );
      violationByChnlObj.chart.plot.plotoptions.bar.datalabels = { show: true };
    }
    return { violationByChnlObj, isViolateByChnlData };
  }
}

export const handleAgentData = (agentFilterObj, normalizerData, rawData, violationId) => {
  let { name, id } = agentFilterObj,
      agentDetails = normalizerData.slaMetrics[id],
      cloneRawData = rawData.slaMetricsData.slice();
  cloneRawData = cloneRawData.sort(sortData);
  if(!agentDetails){
    agentDetails = {
      value: name,
      referenceValue: id,
      violationCount: '0'
    };
  }

  let rawDataList = cloneRawData,
      agentDataList = [agentDetails];
  for(let i=0;i<rawDataList.length;i++){
     if(id != rawDataList[i].referenceValue){
       agentDataList.push(rawDataList[i]);
     }
  }
  rawData.slaMetricsData =  agentDataList;
  return constructSeriesData(rawData, violationId, "agent");
};

export const handleSlaData = (slaFilterObj, normalizerData, rawData, violationId) => {
  let { name, slaId } = slaFilterObj,
      slaDetails = normalizerData.slaMetrics[slaId],
      cloneRawData = rawData.slaMetricsData.slice();
  cloneRawData = cloneRawData.sort(sortData);
  if(!slaDetails){
    slaDetails = {
      value: name,
      referenceValue: slaId,
      violationCount: 0,
      successCount: 0
    };
  }

  let rawDataList = cloneRawData,
      slaDataList = [slaDetails];
  for(let i=0;i<rawDataList.length;i++){
     if(slaId != rawDataList[i].referenceValue){
       slaDataList.push(rawDataList[i]);
     }
  }
  rawData.slaMetricsData =  slaDataList;
  return constructSeriesData(rawData, violationId, "sla");
};

export const sortData = (data1, data2) =>{
  let { violationCount: fViolationCount } = data1,
      { violationCount: fViolationCount1 } = data2;

  return [fViolationCount1 - fViolationCount];
}

export const constructSLAList = (respData) => {
  let { data=[] } = respData,
      slaList = [];

  data.forEach((slaObj)=>{
    let { name, id, isActive, departmentId } = slaObj;
    slaList.push({ name, slaId: id, departmentId });
  });
  return slaList;
}

export const constructSLAListForAllDept = (respData) => {
  let { data=[] } = respData,
      departmentList = SupportUI.Departments.getActiveDepartmentsNameandId(),
      slaListData = [];
  departmentList.forEach((departmentObj,index)=>{
    let { depid: id, depname: name } = departmentObj,
        slaList = [];
    data.forEach((slaObj)=>{
      let { name, id: slaId, isActive, departmentId } = slaObj;
      if(departmentId == id){
        slaList.push({ name, slaId, departmentId });
      }
    });
    slaListData.push({ id, name, slaList });
  });
  return slaListData;
}

export const getDonutChart = (labelText, violation, success) => {
  let isChart = (violation || success) ? true : false,
      chartObj = {};
  if(isChart){
    let chartLabel = [
      "<tspan dy='1.1em' style='font-size:36px;'>{{val(1)}}%</tspan>",
      "<tspan dy='2.5em' style='font:11px var(--zd_semibold);fill:#000'>"+ labelText +"</tspan>"
    ];
    chartObj = getDialChart(violation, success, '#ec5463', '#609af4', chartLabel)
  }
  return { isChart, chartObj };
};

export const getViolationObj = (violationObj) => {
  let { id } = violationObj,
      filterObj = {};
  switch(id){
    case 'RESPONSE':
      filterObj = { id: 'RESPONSE_VIOLATION', label: getI18NValue("support.report.response.violation") }
    break;
    case "FIRST_RESPONSE":
      filterObj = { id: 'FIRST_RESPONSE_VIOLATION', label: getI18NValue('support.report.first.response.violation')}
    break;
    case "RESOLUTION":
      filterObj = { id: 'RESOLUTION_VIOLATION', label: getI18NValue('support.report.resolution.violation') }
    break;
    default:
  }
  return filterObj;
}
