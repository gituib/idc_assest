const logger = require('../utils/logger').module('TopologyRoute');
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Cable = require('../models/Cable');
const Device = require('../models/Device');
const DevicePort = require('../models/DevicePort');
const Rack = require('../models/Rack');
const Room = require('../models/Room');

router.get('/switch/:switchId', async (req, res) => {
  try {
    const { switchId } = req.params;
    const { maxNodes = 100 } = req.query;

    const centerDevice = await Device.findByPk(switchId, {
      include: [
        {
          model: Rack,
          as: 'Rack',
          include: [{ model: Room, as: 'Room' }]
        }
      ]
    });

    if (!centerDevice) {
      return res.status(404).json({ success: false, error: '交换机不存在' });
    }

    if (centerDevice.type !== 'switch') {
      return res.status(400).json({ success: false, error: '指定设备不是交换机' });
    }

    const cables = await Cable.findAll({
      where: {
        [Op.or]: [
          { sourceDeviceId: switchId },
          { targetDeviceId: switchId }
        ]
      },
      include: [
        {
          model: Device,
          as: 'sourceDevice',
          attributes: ['deviceId', 'name', 'type', 'model', 'status', 'ipAddress', 'rackId', 'position']
        },
        {
          model: Device,
          as: 'targetDevice',
          attributes: ['deviceId', 'name', 'type', 'model', 'status', 'ipAddress', 'rackId', 'position']
        }
      ]
    });

    const connectedDeviceIds = new Set();
    cables.forEach(cable => {
      if (cable.sourceDeviceId !== switchId) {
        connectedDeviceIds.add(cable.sourceDeviceId);
      }
      if (cable.targetDeviceId !== switchId) {
        connectedDeviceIds.add(cable.targetDeviceId);
      }
    });

    if (connectedDeviceIds.size > parseInt(maxNodes)) {
      return res.status(400).json({
        success: false,
        error: `连接设备数量(${connectedDeviceIds.size})超过限制(${maxNodes})，请使用更具体的筛选条件`
      });
    }

    const connectedDevices = await Device.findAll({
      where: { deviceId: { [Op.in]: Array.from(connectedDeviceIds) } },
      include: [
        {
          model: Rack,
          as: 'Rack',
          include: [{ model: Room, as: 'Room' }]
        }
      ]
    });

    const deviceMap = {};
    connectedDevices.forEach(device => {
      deviceMap[device.deviceId] = device.toJSON();
    });

    const centerRack = centerDevice.Rack;
    const centerRoom = centerRack?.Room;

    const nodes = [
      {
        id: centerDevice.deviceId,
        deviceId: centerDevice.deviceId,
        name: centerDevice.name,
        type: centerDevice.type,
        model: centerDevice.model,
        status: centerDevice.status,
        ipAddress: centerDevice.ipAddress,
        rackId: centerDevice.rackId,
        rackName: centerRack?.name,
        roomId: centerRoom?.roomId,
        roomName: centerRoom?.name,
        position: centerDevice.position,
        isCenter: true
      },
      ...connectedDevices.map(device => {
        const d = device.toJSON();
        const rack = d.Rack;
        const room = rack?.Room;
        return {
          id: d.deviceId,
          deviceId: d.deviceId,
          name: d.name,
          type: d.type,
          model: d.model,
          status: d.status,
          ipAddress: d.ipAddress,
          rackId: d.rackId,
          rackName: rack?.name,
          roomId: room?.roomId,
          roomName: room?.name,
          position: d.position,
          isCenter: false
        };
      })
    ];

    const edges = cables.map(cable => {
      const sourceId = cable.sourceDeviceId === switchId ? cable.targetDeviceId : cable.sourceDeviceId;
      return {
        id: cable.cableId,
        source: cable.sourceDeviceId,
        target: cable.targetDeviceId,
        sourcePort: cable.sourcePort,
        targetPort: cable.targetPort,
        cableId: cable.cableId,
        cableType: cable.cableType,
        cableLength: cable.cableLength,
        cableLabel: cable.cableLabel,
        cableColor: cable.cableColor,
        status: cable.status,
        description: cable.description,
        installedAt: cable.installedAt
      };
    });

    const portStats = {};
    const allDeviceIds = [switchId, ...Array.from(connectedDeviceIds)];
    const ports = await DevicePort.findAll({
      where: { deviceId: { [Op.in]: allDeviceIds } },
      attributes: ['deviceId', 'status']
    });

    ports.forEach(port => {
      if (!portStats[port.deviceId]) {
        portStats[port.deviceId] = { total: 0, used: 0, free: 0, fault: 0 };
      }
      portStats[port.deviceId].total++;
      if (port.status === 'occupied') portStats[port.deviceId].used++;
      else if (port.status === 'free') portStats[port.deviceId].free++;
      else if (port.status === 'fault') portStats[port.deviceId].fault++;
    });

    nodes.forEach(node => {
      node.portCount = portStats[node.deviceId] || { total: 0, used: 0, free: 0, fault: 0 };
    });

    const statistics = {
      totalDevices: nodes.length,
      totalCables: edges.length,
      normalCables: edges.filter(e => e.status === 'normal').length,
      faultCables: edges.filter(e => e.status === 'fault').length,
      disconnectedCables: edges.filter(e => e.status === 'disconnected').length,
      byDeviceType: {},
      byCableType: {}
    };

    nodes.forEach(node => {
      statistics.byDeviceType[node.type] = (statistics.byDeviceType[node.type] || 0) + 1;
    });

    edges.forEach(edge => {
      statistics.byCableType[edge.cableType] = (statistics.byCableType[edge.cableType] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        centerDevice: nodes[0],
        nodes: nodes.slice(1),
        edges,
        statistics
      }
    });
  } catch (error) {
    logger.error('获取拓扑数据失败', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/rack/:rackId', async (req, res) => {
  try {
    const { rackId } = req.params;
    const { maxNodes = 100 } = req.query;

    const devices = await Device.findAll({
      where: { rackId },
      attributes: ['deviceId']
    });

    const deviceIds = devices.map(d => d.deviceId);

    if (deviceIds.length === 0) {
      return res.json({
        success: true,
        data: {
          nodes: [],
          edges: [],
          statistics: {
            totalDevices: 0,
            totalCables: 0,
            normalCables: 0,
            faultCables: 0,
            disconnectedCables: 0
          }
        }
      });
    }

    const cables = await Cable.findAll({
      where: {
        [Op.or]: [
          { sourceDeviceId: { [Op.in]: deviceIds } },
          { targetDeviceId: { [Op.in]: deviceIds } }
        ]
      },
      include: [
        {
          model: Device,
          as: 'sourceDevice',
          attributes: ['deviceId', 'name', 'type', 'model', 'status', 'ipAddress', 'rackId', 'position']
        },
        {
          model: Device,
          as: 'targetDevice',
          attributes: ['deviceId', 'name', 'type', 'model', 'status', 'ipAddress', 'rackId', 'position']
        }
      ]
    });

    const relatedDeviceIds = new Set(deviceIds);
    cables.forEach(cable => {
      relatedDeviceIds.add(cable.sourceDeviceId);
      relatedDeviceIds.add(cable.targetDeviceId);
    });

    if (relatedDeviceIds.size > parseInt(maxNodes)) {
      return res.status(400).json({
        success: false,
        error: `设备数量(${relatedDeviceIds.size})超过限制(${maxNodes})`
      });
    }

    const allDevices = await Device.findAll({
      where: { deviceId: { [Op.in]: Array.from(relatedDeviceIds) } },
      include: [
        {
          model: Rack,
          as: 'Rack',
          include: [{ model: Room, as: 'Room' }]
        }
      ]
    });

    const nodes = allDevices.map(device => {
      const d = device.toJSON();
      const rack = d.Rack;
      const room = rack?.Room;
      return {
        id: d.deviceId,
        deviceId: d.deviceId,
        name: d.name,
        type: d.type,
        model: d.model,
        status: d.status,
        ipAddress: d.ipAddress,
        rackId: d.rackId,
        rackName: rack?.name,
        roomId: room?.roomId,
        roomName: room?.name,
        position: d.position,
        isCenter: deviceIds.includes(d.deviceId)
      };
    });

    const edges = cables.map(cable => ({
      id: cable.cableId,
      source: cable.sourceDeviceId,
      target: cable.targetDeviceId,
      sourcePort: cable.sourcePort,
      targetPort: cable.targetPort,
      cableId: cable.cableId,
      cableType: cable.cableType,
      cableLength: cable.cableLength,
      status: cable.status
    }));

    const statistics = {
      totalDevices: nodes.length,
      totalCables: edges.length,
      normalCables: edges.filter(e => e.status === 'normal').length,
      faultCables: edges.filter(e => e.status === 'fault').length,
      disconnectedCables: edges.filter(e => e.status === 'disconnected').length
    };

    res.json({ success: true, data: { nodes, edges, statistics } });
  } catch (error) {
    logger.error('获取机柜拓扑数据失败', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
