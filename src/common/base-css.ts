import { css } from 'lit';
import { COLOR_PRIMARY_BG, COLOR_PRIMARY_FG } from './constants.js';

export const baseCss = `
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/fontawesome.min.css');
`;

export const buttonStyles = css`
  .btn {
    font-family: Helvetica, Arial, sans-serif;
    display: inline-block;
    padding: 0.25rem 1rem;
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.5;
    text-align: center;
    white-space: nowrap;
    vertical-align: middle;
    border: 1px solid #999;
    border-radius: 0.25rem;
    cursor: pointer;
    user-select: none;
    background-color: #e5e5e5;
    color: #000;
    box-shadow: 0px 3px 0 #999;
  }

  .btn:not([disabled]):hover {
    transform: translateY(-1px);
    background-color: #fff;
    box-shadow: 0px 4px 0 #999;
  }

  .btn:not([disabled]):active {
    background-color: #999;
    transform: translateY(1px);
    box-shadow: 0px 2px 0 #999;
  }

  .btn[disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn.btn-primary {
    background-color: #c26845;
    border-color: #7e371c;
    color: #fff;
    box-shadow: 0px 3px 0 #7e371c;
  }
  .btn.btn-primary:hover {
    background-color: #eb5e28;
    border-color: #7c2300;
    color: #fff;
    box-shadow: 0px 3px 0 #7c2300;
  }

  .btn.btn-danger {
    background-color: #c24545;
    border-color: #7e1c1c;
    color: #fff;
    box-shadow: 0px 3px 0 #7e1c1c;
  }
  .btn.btn-danger:not([disabled]):hover {
    background-color: #eb2828;
    border-color: #7c0000;
    color: #fff;
    box-shadow: 0px 3px 0 #7c0000;
  }
  .btn.btn-danger:not([disabled]):active {
    background-color: #7c0000;
    box-shadow: 0px 2px 0 #7c0000;
  }

  input {
    background-color: ${COLOR_PRIMARY_BG};
    color: ${COLOR_PRIMARY_FG};
    font-size: 16px;
  }
`;
