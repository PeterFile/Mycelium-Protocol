// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TaskEscrowERC20
 * @author CWP
 * @notice An ERC20-enabled version of the TaskEscrow contract.
 * It allows locking any ERC20 token for task payments, ideal for stablecoins.
 * @dev Includes emergency pause functionality and protection against fee-on-transfer tokens.
 */
contract TaskEscrowERC20 is Ownable, Pausable {
    using SafeERC20 for IERC20;

    uint256 private nextTaskId;
    enum Status {
        Created,
        Approved,
        Paid,
        Cancelled
    }

    struct Task {
        uint256 id;
        address client;
        address agent;
        IERC20 token;
        uint256 amount; // The actual amount received by the contract (after any fees)
        Status status;
        string metadataHash; // IPFS hash or other identifier for task metadata
    }

    mapping(uint256 => Task) public tasks;

    event TaskCreated(
        uint256 indexed taskId,
        address indexed client,
        address indexed agent,
        address token,
        uint256 requestedAmount,
        uint256 actualAmount,
        string metadataHash
    );
    event PaymentApproved(uint256 indexed taskId);
    event PaymentClaimed(uint256 indexed taskId, uint256 amount);
    event TaskCancelled(uint256 indexed taskId);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Creates a new task by pulling approved ERC20 tokens into escrow.
     * @dev IMPORTANT: The client MUST have called `approve()` on the token contract beforehand.
     * @dev Handles fee-on-transfer tokens by checking actual received amount.
     * @param _agent The address of the agent who will perform the task.
     * @param _tokenContract The address of the ERC20 token to be used for payment.
     * @param _amount The amount of tokens to transfer (before any fees).
     * @param _metadataHash Hash or identifier for task metadata (e.g., IPFS hash, JSON string, etc.)
     * @return taskId The ID of the newly created task.
     */
    function createTask(
        address _agent,
        address _tokenContract,
        uint256 _amount,
        string calldata _metadataHash
    ) external whenNotPaused returns (uint256) {
        require(_amount > 0, "TaskEscrow: Amount must be greater than zero");
        require(
            _agent != address(0),
            "TaskEscrow: Agent address cannot be zero"
        );
        require(
            _tokenContract != address(0),
            "TaskEscrow: Token contract address cannot be zero"
        );
        require(
            bytes(_metadataHash).length > 0,
            "TaskEscrow: Metadata hash cannot be empty"
        );
        require(
            _agent != msg.sender,
            "TaskEscrow: Agent cannot be the same as client"
        );

        IERC20 token = IERC20(_tokenContract);

        // Check balance before transfer to handle fee-on-transfer tokens
        uint256 balanceBefore = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), _amount);
        uint256 balanceAfter = token.balanceOf(address(this));

        uint256 actualAmount = balanceAfter - balanceBefore;
        require(
            actualAmount > 0,
            "TaskEscrow: No tokens received (possible fee-on-transfer issue)"
        );

        uint256 taskId = nextTaskId;
        tasks[taskId] = Task({
            id: taskId,
            client: msg.sender,
            agent: _agent,
            token: token,
            amount: actualAmount, // Store the actual amount received
            status: Status.Created,
            metadataHash: _metadataHash
        });

        nextTaskId++;
        emit TaskCreated(
            taskId,
            msg.sender,
            _agent,
            _tokenContract,
            _amount,
            actualAmount,
            _metadataHash
        );
        return taskId;
    }

    /**
     * @notice Allows the client to approve the payment for a completed task.
     * @param _taskId The ID of the task to approve payment for.
     */
    function approvePayment(uint256 _taskId) external whenNotPaused {
        require(_taskId < nextTaskId, "TaskEscrow: Task does not exist");
        Task storage task = tasks[_taskId];
        require(
            msg.sender == task.client,
            "TaskEscrow: Only client can approve payment"
        );
        require(
            task.status == Status.Created,
            "TaskEscrow: Task is not in Created status"
        );

        task.status = Status.Approved;
        emit PaymentApproved(_taskId);
    }

    /**
     * @notice Allows the agent to claim the ERC20 tokens after approval.
     * @param _taskId The ID of the task to claim payment from.
     */
    function claimPayment(uint256 _taskId) external whenNotPaused {
        require(_taskId < nextTaskId, "TaskEscrow: Task does not exist");
        Task storage task = tasks[_taskId];
        require(
            msg.sender == task.agent,
            "TaskEscrow: Only agent can claim payment"
        );
        require(
            task.status == Status.Approved,
            "TaskEscrow: Payment is not approved"
        );

        uint256 paymentAmount = task.amount;
        task.status = Status.Paid;

        emit PaymentClaimed(_taskId, paymentAmount);
        task.token.safeTransfer(task.agent, paymentAmount);
    }

    /**
     * @notice Allows the client to cancel and get a refund of the locked ERC20 tokens.
     * @param _taskId The ID of the task to cancel and refund.
     */
    function cancelTaskAndRefund(uint256 _taskId) external whenNotPaused {
        require(_taskId < nextTaskId, "TaskEscrow: Task does not exist");
        Task storage task = tasks[_taskId];
        require(
            msg.sender == task.client,
            "TaskEscrow: Only client can cancel task"
        );
        require(
            task.status == Status.Created,
            "TaskEscrow: Can only cancel tasks in Created status"
        );

        uint256 refundAmount = task.amount;
        task.status = Status.Cancelled;

        emit TaskCancelled(_taskId);
        task.token.safeTransfer(task.client, refundAmount);
    }

    /**
     * @notice Get task metadata hash for verification by agents
     * @param _taskId The ID of the task
     * @return metadataHash The metadata hash of the task
     */
    function getTaskMetadata(
        uint256 _taskId
    ) external view returns (string memory) {
        require(_taskId < nextTaskId, "TaskEscrow: Task does not exist");
        return tasks[_taskId].metadataHash;
    }

    /**
     * @notice Get complete task information including metadata
     * @param _taskId The ID of the task
     * @return task The complete task struct
     */
    function getTaskInfo(uint256 _taskId) external view returns (Task memory) {
        require(_taskId < nextTaskId, "TaskEscrow: Task does not exist");
        return tasks[_taskId];
    }

    /**
     * @notice Check if a task exists
     * @param _taskId The ID of the task to check
     * @return exists True if the task exists, false otherwise
     */
    function taskExists(uint256 _taskId) external view returns (bool) {
        return _taskId < nextTaskId;
    }

    /**
     * @notice Get the total number of tasks created
     * @return count The total number of tasks
     */
    function getTaskCount() external view returns (uint256) {
        return nextTaskId;
    }

    /**
     * @notice Emergency pause function - can only be called by owner
     * @dev Pauses all critical functions to protect user funds in case of emergency
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause function - can only be called by owner
     * @dev Resumes normal contract operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency function to recover stuck tokens (only for tokens not involved in active tasks)
     * @dev This is a safety mechanism and should only be used in extreme circumstances
     * @param _token The token contract address
     * @param _amount The amount to recover
     */
    function emergencyRecoverToken(
        address _token,
        uint256 _amount
    ) external onlyOwner {
        require(
            _token != address(0),
            "TaskEscrow: Token address cannot be zero"
        );
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}
