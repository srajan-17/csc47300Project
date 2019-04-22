import React from "react"
import { navigate } from "gatsby"
import { isLoggedIn, setUser, getUser, isBrowser } from "../../services/auth"
import { I18n, Auth } from 'aws-amplify';
import { withAuthenticator } from 'aws-amplify-react'
import { Form, Icon, Input, Button, Checkbox } from 'antd';
import dict from "../dictionary/dictionary"
import 'antd/dist/antd.css';
import './login.css';
import Amplify, { API, graphqlOperation } from "aws-amplify";
import * as mutations from '../../graphql/mutations';

class Login extends React.Component {
  state = {
    error: ``,
    language: window.localStorage.getItem('lan')
  }

  handleSubmit = async (e) => {
    e.preventDefault();
    this.props.form.validateFields(async (err, values) => {
      if (err) {
        console.log(err);
        return
      }
      console.log('Received values of form: ', values);
      const { userName, password } = values;
      try {
        await Auth.signIn(userName, password)
        const user = await Auth.currentAuthenticatedUser();
        const userInfo = {
          ...user.attributes,
          username: user.username
        }
        setUser(userInfo)
        // the next line must not be deleted and I don't know why
        console.log(userInfo);
        (userInfo['custom:isEmployer'] === 'no') ? navigate("/app/user-profile/" + userInfo.username) : navigate("/app/business-profile")
      } catch (err) {
        this.setState({ error: err })
        console.log('error....: ', err)
      }
      try {
        const userInfo = getUser();
        const { email, name, phone_number, sub, username } = userInfo
        const profileExist = userInfo['custom:isProfile'];
        if (profileExist === 'no') {
          const data = {
            id: sub,
            username: username,
            firstName: name,
            phone: phone_number,
            email: email,
          }
          const newEmployee = await API.graphql(graphqlOperation(mutations.createEmployee, { input: data }));
          console.log(newEmployee);
          Auth.currentAuthenticatedUser()
            .then(user => {
              return Auth.updateUserAttributes(user, { 'custom:isProfile': 'yes' });
            })
            .then(data => console.log(data))
            .catch(err => console.log(err));
        }
        //console.log(sub);
        //console.log(userInfo);
      } catch (err) {
        console.log('error in second try: ', err)
      }

      this.props.form.resetFields();
    });
  }

  render() {
    I18n.putVocabularies(dict);
    I18n.setLanguage(this.state.language);
    const { getFieldDecorator } = this.props.form;
    return (
      <div align='center'>
        <br />
        <h1>Login</h1>
        <Form onSubmit={this.handleSubmit} className="login-form" style={{ "width": "80%" }}>
          <Form.Item>
            {getFieldDecorator('userName', {
              rules: [{ required: true, message: 'Please input your username!' }],
            })(
              <Input prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder={I18n.get('username')} />
            )}
          </Form.Item>
          <Form.Item>
            {getFieldDecorator('password', {
              rules: [{ required: true, message: 'Please input your Password!' }],
            })(
              <Input prefix={<Icon type="lock" style={{ color: 'rgba(0,0,0,.25)' }} />} type="password" placeholder={I18n.get('password')} />
            )}
          </Form.Item>
          <Form.Item>
            <a className="login-form-forgot" href="">Forgot password</a>
            <Button type="primary" htmlType="submit" className="login-form-button">
              Log in
          </Button>
            Or <a href="">register now!</a>
          </Form.Item>
        </Form>
      </div>
    );

  }
}
const WrappedNormalLoginForm = Form.create({ name: 'normal_login' })(Login);
export default WrappedNormalLoginForm;
