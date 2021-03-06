import React from 'react';
import Person from '../components/user_profile/person';
import Information from '../components/user_profile/information';
import Amplify, { Auth, API, graphqlOperation, I18n, Storage } from "aws-amplify";
import * as queries from '../graphql/queries';
import * as customQueries from '../customGraphql/queries';
import * as mutations from '../graphql/mutations';
import { getUser, isLoggedIn, getLanguage } from '../services/auth';
import dict from "../components/dictionary/dictionary"
import { Layout, Skeleton, Menu, Icon, message, Button } from 'antd';
import PhotoUploader from '../components/user_profile/photoUploader';
import ResumeUploader from '../components/user_profile/resumeUploader';
import { Link, navigate } from "gatsby";
import BasicInfoForm from "../components/user_profile/basicInfoForm";
import AddEduForm from "../components/form/addEducation";
import AddExpForm from "../components/form/addExperience";
import UpdateAddressForm from "../components/form/updateAddress";
import CreateAddressForm from "../components/form/createAddress";
import { async } from 'q';
import "../style/userProfile.css";


// Some components from the ant-design
const { Header, Footer, Sider, Content } = Layout;
const SubMenu = Menu.SubMenu;

// The profile page of a user
/**
 * The class Profile will render the page of the user profile.
 * It will render the edit profile buttons if the user is viewing his own profile
 * It will not render the edit profile buttons if the user is viewing others profile
 */
class Profile extends React.Component {

    /**
     * the constructor will initilize the state of user profile
     * @param {object} props
     */
    constructor(props) {
        super(props);
        this.state = {
            lan: getLanguage() ? getLanguage() : 'es',      // if the language is not chose, the default will be english
            userID: this.props.userID,                      // the userID will be passed from the query params
            loading: true,                                  // true when fetching data
            collapsed: false,                               // hide the sidebar
            education: [],                                  // education of the user
            experiences: [],
            address: [],                                // experince of the user
            allowEdit: this.props.userID === getUser().sub  // check if the user is viewing his own profile
        }
    }
    // hide the sidebar
    /**
     * hide the sidebar
     */
    onCollapse = (collapsed) => {
        console.log(collapsed);
        this.setState({ collapsed });
    }
    /**
     * fetch user information from dynamodb
     */
    fetchUserInfo = async () => {
        try {
            const user = await API.graphql(graphqlOperation(queries.getEmployee, { id: this.state.userID }));
            this.setState({
                user: user.data.getEmployee,
            })
            console.log(user.data.getEmployee);
        } catch (err) {
            console.log("From userProfile.js - error in getting the user's information", err);
        }
    }
    /** 
     * fetch user's address 
     */
    fetchAddress = async () => {
        try {
            const userAdd = await API.graphql(graphqlOperation(queries.getAddress, { id: this.state.userID }));
            this.setState({
                address: userAdd
            });
        } catch (err) {
            console.log("From userProfile.js - error in getting the user's address", err);
        }
    }
    /**
     * using custom query to fetch user's applied jobs
     */
    fetchAppliedJob = async () => {
        try {
            const testing = await API.graphql(graphqlOperation(customQueries.getAppliedJobEmployee, { id: this.state.userID }));
            const temp = testing.data.getEmployee.appliedJob.items;
            const transformJob = temp.map(item => {
                const jobID = item.Job.id
                const { datePosted, deadline, jobTitle } = item.Job
                const job = {
                    jobID: jobID,
                    jobTitle: jobTitle,
                    datePosted: datePosted,
                    deadline: deadline,
                    status: item.status,
                    dateApplied: item.dateApplied
                }
                return job;
            })
            this.setState({
                jobs: transformJob
            })
        } catch (err) {
            console.log("custom queries failed", err);
        }
    }
    /**
     * fetch user's education information
     */
    fetchEducation = async () => {
        try {
            const educationResults = await API.graphql(graphqlOperation(customQueries.getEducationEmployee, { id: this.state.userID }));
            const temp = educationResults.data.getEmployee.education.items;
            this.setState({ education: temp });
        } catch (err) {
            console.log("couldn't get education: ", err);
        }
    }
    /**
     * fetch user's experiences
     */
    fetchExperience = async () => {
        try {
            const experienceResults = await API.graphql(graphqlOperation(customQueries.getExperienceEmployee, { id: this.state.userID }));
            const temp = experienceResults.data.getEmployee.experience.items;
            this.setState({ experiences: temp });
        } catch (err) {
            console.log("couldn't get experience: ", err);
        }
    }
    /** 
     * fetch user photo from AWS Storage
     */
    fetchPhoto = async () => {
        if (this.state.user.pic === 'yes') {
            Storage.get('profilePic', {
                level: 'protected',
                identityId: this.state.user.identityID// the identityId of that user
            })
                .then(result => {
                    console.log(result);
                    let user = this.state.user;
                    user.pic = result;
                    console.log("state is", this.state);
                    this.setState({ user: user });
                })
                .catch(err => console.log(err));
        }
    }

    // where all the data fetching happen
    /**
     * where all the data fetching happen
     */
    componentDidMount = async () => {
        // fetch the user info
        await this.fetchUserInfo();

        // fetch user's address
        await this.fetchAddress();

        // fetch the employee's applied jobs
        await this.fetchAppliedJob();

        // fetch the employee's education
        await this.fetchEducation();

        // fetch the employee's experiences
        await this.fetchExperience();

        // fetch photo
        await this.fetchPhoto();

        this.setState({
            loading: false
        })
    }
    // TODO function for uploading resume
    onChange(info) {
        if (info.file.status !== 'uploading') {
            console.log(info.file, info.fileList);
        }
        if (info.file.status === 'done') {
            message.success(`${info.file.name} file uploaded successfully`);
        } else if (info.file.status === 'error') {
            message.error(`${info.file.name} file upload failed.`);
        }
    }

    /**
     * delete the education information of the user
     */
    deleteEducation = async (key, e) => {
        // call API to delete education
        try {
            const delEdu = await API.graphql(graphqlOperation(mutations.deleteEducation, { input: { id: key } }));
            console.log("this item was deleted: ", delEdu);
            message.success(`Education deleted`);
        } catch (err) {
            console.log("error - ", err);
            message.error(`Couldn't delete education`);
        }
        let edu = [...this.state.education];
        let deleteIndex = edu.findIndex((item) => item.id === key);
        let willDelete = false;
        edu.forEach(item => {
            if (item.id === key) {
                willDelete = true;
            }
        })
        if (willDelete) {
            edu.splice(deleteIndex, 1);
            this.setState({ education: edu });
        }
    }
    /**
    * delete the user's experience information 
    */
    deleteExperience = async (key, e) => {
        // call API to delete
        try {
            const delExp = await API.graphql(graphqlOperation(mutations.deleteExperience, { input: { id: key } }));
            console.log("this item was deleted: ", delExp);
            message.success(`Experience deleted`);
        } catch (err) {
            console.log("error - ", err);
            message.error(`Couldn't delete experience`);
        }
        // remove it from the page
        let exp = [...this.state.experiences];
        let deleteIndex = exp.findIndex((item) => item.id === key);
        let willDelete = false;
        exp.forEach(item => {
            if (item.id === key) {
                willDelete = true;
            }
        })
        if (willDelete) {
            exp.splice(deleteIndex, 1);
            this.setState({ experiences: exp });
        }
    }
    /**
     * delete the user's address
     */
    deleteAddress = async () => {
        try {
            const delAdd = await API.graphql(graphqlOperation(mutations.deleteAddress, { input: { id: this.state.userID } }));
            console.log("User address was deleted.");
            message.success(`Address deleted`);
            window.location.reload();
        } catch (err) {
            console.log("From userProfile.js - could not delete address", err);
            message.error(`Couldn't delete address`);
        }
    }
    /**
     * begin to render
     */
    render() {
        // setup the dictionary
        I18n.putVocabularies(dict);
        I18n.setLanguage(this.state.lan);
        // if the fetching is not done
        /**
         * make the information is fetched before rendering
         */
        if (this.state.loading) {
            return (
                <Skeleton active />
            );
        }
        return (
            <div>
                <Layout style={{ minHeight: '100vh' }}>
                    <Sider
                        collapsible
                        collapsed={this.state.collapsed}
                        onCollapse={this.onCollapse}
                        width={300}
                    >
                        <Person user={this.state.user} />
                        {/**
                    * render those edit button when user is viewing his own profile page
                    */}
                        {(getUser().sub === this.state.userID) ? (
                            <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
                                <SubMenu
                                    key="sub1"
                                    title={<span><Icon type="form" /><span>{I18n.get('Edit Profile')}</span></span>}
                                >
                                    <Menu.Item key="3">
                                        <BasicInfoForm userInfo={this.state.user} />
                                        {/* {I18n.get('Modify Basic Info')} */}
                                    </Menu.Item>

                                    {this.state.address.data.getAddress ?
                                        <Menu.Item key="5">
                                            <UpdateAddressForm />
                                        </Menu.Item> :
                                        <Menu.Item key="4">
                                            <CreateAddressForm />
                                        </Menu.Item>}

                                    {this.state.address.data.getAddress ?
                                        <Menu.Item key="6">
                                            <Button className="modify-info-button" ghost onClick={this.deleteAddress}>
                                                <Icon type="delete" theme="twoTone" twoToneColor="#52c41a" />Delete Address</Button>
                                        </Menu.Item> : null}

                                    <Menu.Item key="7">
                                        <AddEduForm />
                                    </Menu.Item>

                                    <Menu.Item key="8">
                                        <AddExpForm />
                                    </Menu.Item>
                                </SubMenu>

                                <Menu.Item key="2">
                                    <PhotoUploader />

                                    {/* <span>{I18n.get('Change Profile Picture')}</span> */}
                                </Menu.Item>

                                <Menu.Item key="9">
                                    <ResumeUploader onChange={this.onChange} />
                                </Menu.Item>
                            </Menu>) : null
                        }
                    </Sider>
                    <Content>
                        <Information
                            user={this.state.user}
                            address={this.state.address}
                            jobs={this.state.jobs}
                            education={this.state.education}
                            experiences={this.state.experiences}
                            allowEdit={this.state.allowEdit}
                            deleteEdu={this.deleteEducation}
                            deleteExp={this.deleteExperience}
                        />
                    </Content>
                </Layout>
                <Footer style={{ textAlign: 'center' }}>
                    {I18n.get('JobFirst')} ©2019 {I18n.get('Created by JobFirst Group')}
                </Footer>
            </div>
        );
    }
}

export default Profile;