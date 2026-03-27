const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Device = require('../models/Device');
const Rack = require('../models/Rack');
const Room = require('../models/Room');
const User = require('../models/User');
const Ticket = require('../models/Ticket');

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const dayQueries = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOfWeek = (dayStart.getDay() + 6) % 7;

      dayQueries.push({
        label: weekDays[dayOfWeek],
        query: Device.count({
          where: {
            createdAt: {
              [Op.gte]: dayStart,
              [Op.lt]: dayEnd,
            },
          },
        }),
      });
    }

    const dayResults = await Promise.all(dayQueries.map(d => d.query));
    const deviceTrendData = dayQueries.map((d, index) => ({
      label: d.label,
      value: dayResults[index],
    }));

    const [
      totalDevices,
      faultDevices,
      totalRacks,
      rooms,
      totalUsers,
      activeTickets,
      newDevicesThisWeek,
      newDevicesLastWeek,
      faultDevicesThisWeek,
      faultDevicesLastWeek,
      newUsersThisWeek,
      newUsersLastWeek,
      newTicketsThisWeek,
      newTicketsLastWeek,
      runningDevices,
      maintenanceDevices,
      offlineDevices,
    ] = await Promise.all([
      Device.count(),
      Device.count({ where: { status: 'fault' } }),
      Rack.count(),
      Room.findAll(),
      User.count(),
      Ticket.count({ where: { status: 'open' } }),
      Device.count({ where: { createdAt: { [Op.gte]: oneWeekAgo } } }),
      Device.count({ where: { createdAt: { [Op.gte]: twoWeeksAgo, [Op.lt]: oneWeekAgo } } }),
      Device.count({ where: { status: 'fault', updatedAt: { [Op.gte]: oneWeekAgo } } }),
      Device.count({
        where: { status: 'fault', updatedAt: { [Op.gte]: twoWeeksAgo, [Op.lt]: oneWeekAgo } },
      }),
      User.count({ where: { createdAt: { [Op.gte]: oneWeekAgo } } }),
      User.count({ where: { createdAt: { [Op.gte]: twoWeeksAgo, [Op.lt]: oneWeekAgo } } }),
      Ticket.count({ where: { createdAt: { [Op.gte]: oneWeekAgo } } }),
      Ticket.count({ where: { createdAt: { [Op.gte]: twoWeeksAgo, [Op.lt]: oneWeekAgo } } }),
      Device.count({ where: { status: 'running' } }),
      Device.count({ where: { status: 'maintenance' } }),
      Device.count({ where: { status: 'offline' } }),
    ]);

    let deviceGrowth = 0;
    if (newDevicesLastWeek > 0) {
      deviceGrowth = parseFloat(
        (((newDevicesThisWeek - newDevicesLastWeek) / newDevicesLastWeek) * 100).toFixed(1)
      );
    } else if (newDevicesThisWeek > 0) {
      deviceGrowth = 100;
    } else {
      deviceGrowth = 0;
    }

    let faultTrend = 0;
    if (faultDevicesLastWeek > 0) {
      faultTrend = parseFloat(
        (((faultDevicesThisWeek - faultDevicesLastWeek) / faultDevicesLastWeek) * 100).toFixed(1)
      );
    } else if (faultDevicesThisWeek > 0) {
      faultTrend = 100;
    } else {
      faultTrend = 0;
    }

    let userGrowth = 0;
    if (newUsersLastWeek > 0) {
      userGrowth = parseFloat(
        (((newUsersThisWeek - newUsersLastWeek) / newUsersLastWeek) * 100).toFixed(1)
      );
    } else if (newUsersThisWeek > 0) {
      userGrowth = 100;
    } else {
      userGrowth = 0;
    }

    let ticketTrend = 0;
    if (newTicketsLastWeek > 0) {
      ticketTrend = parseFloat(
        (((newTicketsThisWeek - newTicketsLastWeek) / newTicketsLastWeek) * 100).toFixed(1)
      );
    } else if (newTicketsThisWeek > 0) {
      ticketTrend = 100;
    } else {
      ticketTrend = 0;
    }

    const onlineRate =
      totalDevices > 0 ? (((totalDevices - faultDevices) / totalDevices) * 100).toFixed(1) : 100;

    const totalRooms = rooms.length;

    const racks = await Rack.findAll();
    const totalPower = racks.reduce((sum, rack) => sum + (rack.currentPower || 0), 0);
    const totalMaxPower = racks.reduce((sum, rack) => sum + (rack.maxPower || 0), 0);

    res.json({
      totalDevices,
      totalRacks,
      totalRooms,
      totalUsers,
      activeTickets,
      faultDevices,
      deviceGrowth,
      faultTrend,
      userGrowth,
      ticketTrend,
      onlineRate,
      powerUsage: Math.floor(totalPower) || 0,
      totalMaxPower: Math.floor(totalMaxPower) || 10000,
      deviceStatus: {
        running: runningDevices,
        maintenance: maintenanceDevices,
        fault: faultDevices,
        offline: offlineDevices,
      },
      deviceTrendData,
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
