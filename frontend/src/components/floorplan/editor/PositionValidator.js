const PositionValidator = {
  validate(rack, newRow, newCol, allRacks, gridRows, gridCols) {
    if (newRow < 0 || newRow >= gridRows) {
      return { valid: false, error: `行位置超出范围(0-${gridRows - 1})` };
    }
    if (newCol < 0 || newCol >= gridCols) {
      return { valid: false, error: `列位置超出范围(0-${gridCols - 1})` };
    }

    const conflict = allRacks.find(
      r => r.rowPos === newRow &&
           r.colPos === newCol &&
           r.rackId !== rack.rackId
    );

    if (conflict) {
      return { valid: false, error: `位置已被机柜"${conflict.name}"占用` };
    }

    return { valid: true };
  },

  validateBatch(positions, allRacks, gridRows, gridCols) {
    const errors = [];
    const occupiedMap = new Map();

    allRacks.forEach(r => {
      if (r.rowPos != null && r.colPos != null) {
        occupiedMap.set(`${r.rowPos}-${r.colPos}`, r);
      }
    });

    positions.forEach((pos, index) => {
      if (pos.rowPos < 0 || pos.rowPos >= gridRows) {
        errors.push({ index, error: `行位置${pos.rowPos}超出范围` });
        return;
      }
      if (pos.colPos < 0 || pos.colPos >= gridCols) {
        errors.push({ index, error: `列位置${pos.colPos}超出范围` });
        return;
      }

      const key = `${pos.rowPos}-${pos.colPos}`;
      const existing = occupiedMap.get(key);
      if (existing && existing.rackId !== pos.rackId) {
        errors.push({ index, error: `位置(${pos.rowPos},${pos.colPos})已被"${existing.name}"占用` });
      }

      occupiedMap.set(key, { rackId: pos.rackId, name: pos.rackId });
    });

    return errors;
  },
};

export default PositionValidator;
