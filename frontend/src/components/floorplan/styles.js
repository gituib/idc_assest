import styled from 'styled-components';

export const PageContainer = styled.div`
  height: calc(100vh - 64px);
`;

export const ContentWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

export const CanvasContainer = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
`;

export const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  z-index: 5;
`;

export const EmptyStateContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
`;

export const EmptyStateTitle = styled.div`
  font-size: 16px;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 8px;
`;

export const EmptyStateSubtitle = styled.div`
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 16px;
`;

export const DeviceTooltipContainer = styled.div`
  position: fixed;
  left: ${props => props.$x + 18}px;
  top: ${props => props.$y + 18}px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 14px 18px;
  z-index: 1000;
  min-width: 220px;
  pointer-events: none;
`;

export const DeviceTooltipHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`;

export const DeviceTypeIndicator = styled.div`
  width: 5px;
  height: 20px;
  background: ${props => props.$color};
  border-radius: 3px;
`;

export const DeviceName = styled.strong`
  font-size: 15px;
  color: #111827;
`;

export const DeviceInfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
`;

export const DeviceInfoLabel = styled.span`
  color: #6b7280;
`;

export const DeviceInfoValue = styled.span`
  font-weight: 500;
  color: ${props => props.$color || '#4b5563'};
  font-family: ${props => props.$mono ? 'SFMono-Regular, Monaco, Consolas, monospace' : 'inherit'};
`;

export const DeviceInfoContent = styled.div`
  font-size: 13px;
  color: #4b5563;
  line-height: 22px;
`;

export const ToolbarWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  flex-wrap: wrap;
  gap: 12px;
`;

export const ToolbarDivider = styled.div`
  width: 1px;
  height: 28px;
  background: #e8e8e8;
`;

export const ZoomControlsWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8f9fa;
  padding: 6px 10px;
  border-radius: 8px;
`;

export const ZoomPercent = styled.div`
  min-width: 52px;
  text-align: center;
  font-size: 11px;
  color: #595959;
  user-select: none;
  font-weight: 500;
  padding: 0 4px;
`;

export const RoomOptionContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const RoomIndicator = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #1677ff;
`;

export const DetailSection = styled.div`
  margin-top: 16px;
`;

export const DetailSectionTitle = styled.div`
  margin-bottom: 8px;
  font-weight: 500;
`;
