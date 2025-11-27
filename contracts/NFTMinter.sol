// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title NFTMinter
 * @notice ERC721 collection with allowlist + public mint, reveal workflow, and withdraw mechanics.
 */
contract NFTMinter is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;

    /* ------------------------------------------------------------ *
     *                           Errors
     * ------------------------------------------------------------ */
    error MintClosed();
    error AllowlistMintClosed();
    error PublicMintClosed();
    error MintExceedsMaxSupply();
    error InvalidProof();
    error InsufficientPayment();
    error ExceedsWalletLimit();
    error NonexistentToken();
    error NothingToWithdraw();
    error EmptyURI();

    /* ------------------------------------------------------------ *
     *                           Events
     * ------------------------------------------------------------ */
    event Mint(address indexed minter, uint256 quantity, uint256 pricePaid);
    event Reveal(string newBaseURI);
    event Withdraw(address indexed to, uint256 amount);
    event MintPriceUpdated(uint256 newMintPrice);
    event MerkleRootUpdated(bytes32 newMerkleRoot);
    event BaseURIUpdated(string newBaseURI);
    event HiddenURIUpdated(string newHiddenURI);
    event SaleStateUpdated(bool allowlistOpen, bool publicOpen);

    /* ------------------------------------------------------------ *
     *                       State Variables
     * ------------------------------------------------------------ */
    uint256 public immutable maxSupply;
    uint256 public mintPrice;
    uint256 public maxPerWallet;

    uint256 private _totalMinted;
    uint256 private _nextTokenId = 1;

    bool public allowlistMintOpen;
    bool public publicMintOpen;
    bool public revealed;

    bytes32 public merkleRoot;
    string private _baseTokenURI;
    string private _hiddenTokenURI;

    mapping(address => uint256) private _walletMintCount;

    /* ------------------------------------------------------------ *
     *                         Constructor
     * ------------------------------------------------------------ */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        uint256 mintPrice_,
        uint256 maxPerWallet_,
        string memory hiddenURI_,
        bytes32 merkleRoot_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        if (maxSupply_ == 0) revert MintExceedsMaxSupply();
        if (bytes(hiddenURI_).length == 0) revert EmptyURI();

        maxSupply = maxSupply_;
        mintPrice = mintPrice_;
        maxPerWallet = maxPerWallet_;
        _hiddenTokenURI = hiddenURI_;
        merkleRoot = merkleRoot_;
    }

    /* ------------------------------------------------------------ *
     *                        View Functions
     * ------------------------------------------------------------ */
    function totalMinted() external view returns (uint256) {
        return _totalMinted;
    }

    function walletMintCount(address account) external view returns (uint256) {
        return _walletMintCount[account];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken();

        if (!revealed) {
            return _hiddenTokenURI;
        }

        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
    }

    /* ------------------------------------------------------------ *
     *                       Mint Functions
     * ------------------------------------------------------------ */
    function allowlistMint(
        uint256 amount,
        bytes32[] calldata proof
    ) external payable nonReentrant {
        if (!allowlistMintOpen) revert AllowlistMintClosed();
        _validateMint(amount);
        _validatePayment(amount);

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert InvalidProof();

        _mintTokens(msg.sender, amount);
    }

    function publicMint(uint256 amount) external payable nonReentrant {
        if (!publicMintOpen) revert PublicMintClosed();
        _validateMint(amount);
        _validatePayment(amount);

        _mintTokens(msg.sender, amount);
    }

    /* ------------------------------------------------------------ *
     *                      Owner Functions
     * ------------------------------------------------------------ */
    function setMintPrice(uint256 newMintPrice) external onlyOwner {
        mintPrice = newMintPrice;
        emit MintPriceUpdated(newMintPrice);
    }

    function setMaxPerWallet(uint256 newMaxPerWallet) external onlyOwner {
        maxPerWallet = newMaxPerWallet;
    }

    function setMerkleRoot(bytes32 newRoot) external onlyOwner {
        merkleRoot = newRoot;
        emit MerkleRootUpdated(newRoot);
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        if (bytes(newBaseURI).length == 0) revert EmptyURI();
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function setHiddenURI(string calldata newHiddenURI) external onlyOwner {
        if (bytes(newHiddenURI).length == 0) revert EmptyURI();
        _hiddenTokenURI = newHiddenURI;
        emit HiddenURIUpdated(newHiddenURI);
    }

    function toggleSaleState(bool allowlistOpen_, bool publicOpen_) external onlyOwner {
        allowlistMintOpen = allowlistOpen_;
        publicMintOpen = publicOpen_;
        emit SaleStateUpdated(allowlistOpen_, publicOpen_);
    }

    function reveal(string calldata newBaseURI) external onlyOwner {
        if (bytes(newBaseURI).length == 0) revert EmptyURI();
        revealed = true;
        _baseTokenURI = newBaseURI;
        emit Reveal(newBaseURI);
    }

    function withdraw(address payable to) external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert NothingToWithdraw();

        address payable recipient = to == address(0) ? payable(owner()) : to;
        recipient.transfer(balance);
        emit Withdraw(recipient, balance);
    }

    /* ------------------------------------------------------------ *
     *                      Internal Helpers
     * ------------------------------------------------------------ */
    function _validateMint(uint256 amount) internal view {
        if (amount == 0) revert MintClosed();
        if (_totalMinted + amount > maxSupply) revert MintExceedsMaxSupply();
        if (maxPerWallet > 0 && _walletMintCount[msg.sender] + amount > maxPerWallet) {
            revert ExceedsWalletLimit();
        }
    }

    function _validatePayment(uint256 amount) internal view {
        uint256 required = mintPrice * amount;
        if (msg.value < required) revert InsufficientPayment();
    }

    function _mintTokens(address to, uint256 amount) internal {
        uint256 id = _nextTokenId;
        unchecked {
            _nextTokenId += amount;
        }
        for (uint256 i = 0; i < amount; ) {
            _safeMint(to, id + i);
            unchecked {
                ++i;
            }
        }

        _totalMinted += amount;
        _walletMintCount[to] += amount;
        emit Mint(to, amount, mintPrice * amount);
        _refundExcess(amount);
    }

    function _refundExcess(uint256 amount) internal {
        uint256 required = mintPrice * amount;
        if (msg.value > required) {
            payable(msg.sender).transfer(msg.value - required);
        }
    }
}

