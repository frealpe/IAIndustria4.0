import { Control } from '../../components/control/Control';

const Principal = () => {

  return (
    <div className="p-1">
      <div style={{ maxHeight: '95vh', overflowY: 'auto', overflowX: 'hidden' }}>
        <Control />
      </div>
    </div>
  );
};

export default Principal;
