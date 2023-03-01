import clsx from 'clsx';
import Image from 'next/image';
import styles from './button.module.scss';

type TButton = {
  handleClick: (e?: any) => void;
  type?: 'base' | 'primary' | 'success' | 'danger' | 'lightBlue';
  size?: 'default' | 'medium' | 'small' | 'mini';
  shape?: 'round' | 'squareRound';
  plain?: boolean;
  icon?: string;
  children?: any;
  disabled?: boolean;
};

function Button(props: TButton) {
  const {
    handleClick,
    children,
    icon,
    disabled,
    type = 'base',
    shape,
    plain,
    size = 'default'
  } = props;

  return (
    <div
      className={clsx(
        'cursor-pointer',
        styles.btn,
        styles[type],
        styles[size],
        shape && styles[shape],
        disabled && 'cursor-no-drop',
        plain && styles.plain
      )}
      onClick={handleClick}
    >
      {icon && <Image src={icon} alt="pgsql" width={16} height={16} />}
      {children}
    </div>
  );
}

export default Button;
